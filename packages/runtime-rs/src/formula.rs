use crate::state::{RuntimeState, RuntimeValue, js_number_string};

/// Evaluate the same deliberately small arithmetic language as the TS runtime.
/// Unknown variable names resolve to zero and division by zero yields zero.
pub fn evaluate(formula: &str, state: &RuntimeState) -> f64 {
    evaluate_with(formula, |name| {
        Ok::<_, std::convert::Infallible>(
            state
                .entity_state
                .as_ref()
                .and_then(|entities| entities.resources.get(name).copied())
                .or_else(|| state.variables.get(name).and_then(RuntimeValue::as_number)),
        )
    })
    .unwrap_or_else(|never| match never {})
}

/// Resolve every identifier in token order before parsing, including tokens after
/// a malformed expression. The host supplies resource precedence and live values.
pub(crate) fn evaluate_with<E>(
    formula: &str,
    mut lookup: impl FnMut(&str) -> Result<Option<f64>, E>,
) -> Result<f64, E> {
    let mut tokens = tokenize(formula);
    for token in &mut tokens {
        if is_identifier(token) {
            *token = js_number_string(lookup(token)?.unwrap_or_default());
        }
    }
    Ok(parse(&tokens))
}

fn tokenize(input: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut chars = input.char_indices().peekable();
    while let Some((start, ch)) = chars.next() {
        if ch.is_ascii_digit() {
            let mut end = start + ch.len_utf8();
            while let Some(&(index, next)) = chars.peek() {
                if next.is_ascii_digit() {
                    chars.next();
                    end = index + next.len_utf8();
                } else {
                    break;
                }
            }
            if let Some(&(index, '.')) = chars.peek() {
                chars.next();
                end = index + 1;
                while let Some(&(index, next)) = chars.peek() {
                    if next.is_ascii_digit() {
                        chars.next();
                        end = index + next.len_utf8();
                    } else {
                        break;
                    }
                }
            }
            tokens.push(input[start..end].to_string());
        } else if ch.is_ascii_alphabetic() || ch == '_' {
            let mut end = start + ch.len_utf8();
            while let Some(&(index, next)) = chars.peek() {
                if next.is_ascii_alphanumeric() || next == '_' {
                    chars.next();
                    end = index + next.len_utf8();
                } else {
                    break;
                }
            }
            tokens.push(input[start..end].to_string());
        } else if matches!(ch, '+' | '-' | '*' | '/' | '(' | ')') {
            tokens.push(ch.to_string());
        }
    }
    tokens
}

fn is_identifier(token: &str) -> bool {
    let mut chars = token.chars();
    chars
        .next()
        .is_some_and(|ch| ch.is_ascii_alphabetic() || ch == '_')
        && chars.all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
}

#[derive(Default)]
struct Expression {
    sum: Option<(f64, bool)>,
    product: Option<(f64, bool)>,
}

impl Expression {
    fn finish_product(&mut self, factor: f64) -> f64 {
        match self.product.take() {
            None => factor,
            Some((left, false)) => left * factor,
            Some((_, true)) if factor == 0.0 => 0.0,
            Some((left, true)) => left / factor,
        }
    }

    fn finish_sum(&mut self, term: f64) -> f64 {
        match self.sum.take() {
            None => term,
            Some((left, false)) => left + term,
            Some((left, true)) => left - term,
        }
    }
}

// The former recursive JS parser returned zero after exhausting its call
// stack. Use explicit frames so deep input can never trap the Wasm instance.
const MAX_NESTING: usize = 16_384;

fn parse(tokens: &[String]) -> f64 {
    let mut tokens = tokens.iter().map(String::as_str).peekable();
    let mut expression = Expression::default();
    let mut parents = Vec::new();
    loop {
        let mut negate = false;
        let mut unary_depth = 0;
        while let Some(sign @ ("+" | "-")) = tokens.peek().copied() {
            unary_depth += 1;
            if parents.len() + unary_depth > MAX_NESTING {
                return 0.0;
            }
            negate ^= sign == "-";
            tokens.next();
        }
        let token = tokens.next();
        if token == Some("(") {
            if parents.len() >= MAX_NESTING {
                return 0.0;
            }
            parents.push((std::mem::take(&mut expression), negate));
            continue;
        }
        let mut value = token
            .and_then(|value| value.parse::<f64>().ok())
            .filter(|value| !value.is_nan())
            .unwrap_or_default();
        if negate {
            value = -value;
        }

        loop {
            value = expression.finish_product(value);
            if let Some(op @ ("*" | "/")) = tokens.peek().copied() {
                expression.product = Some((value, op == "/"));
                tokens.next();
                break;
            }
            value = expression.finish_sum(value);
            if let Some(op @ ("+" | "-")) = tokens.peek().copied() {
                expression.sum = Some((value, op == "-"));
                tokens.next();
                break;
            }
            let Some((parent, negate)) = parents.pop() else {
                return value;
            };
            if tokens.peek() == Some(&")") {
                tokens.next();
            }
            expression = parent;
            if negate {
                value = -value;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::evaluate;
    use crate::state::{EntityRuntimeState, RuntimeState, RuntimeValue};

    #[test]
    fn deeply_nested_input_returns_zero_without_exhausting_the_runtime_stack() {
        let formula = format!("{}3{}", "(".repeat(60_000), ")".repeat(60_000));
        assert_eq!(evaluate(&formula, &RuntimeState::initial("start")), 0.0);
    }

    #[test]
    fn formula_uses_standard_precedence_unary_operators_and_safe_division() {
        let mut state = RuntimeState::initial("start");
        state
            .variables
            .insert("wisdom".into(), RuntimeValue::Json(serde_json::json!(4)));
        state.entity_state = Some(EntityRuntimeState {
            owned: Default::default(),
            active: Default::default(),
            unlocked: Default::default(),
            resources: [("mana".to_string(), 8.0)].into_iter().collect(),
            extensions: None,
        });
        assert_eq!(evaluate("2 + wisdom * (mana - 2)", &state), 26.0);
        assert_eq!(evaluate("-wisdom + +3", &state), -1.0);
        assert_eq!(evaluate("mana / 0", &state), 0.0);
        assert_eq!(evaluate("missing + 2", &state), 2.0);
    }
}

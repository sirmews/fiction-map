use crate::state::{RuntimeState, RuntimeValue, js_number_string};

/// Evaluate the same deliberately small arithmetic language as the TS runtime.
/// Unknown variable names resolve to zero and division by zero yields zero.
pub fn evaluate(formula: &str, state: &RuntimeState) -> f64 {
    let tokens = tokenize(formula);
    if tokens.is_empty() {
        return 0.0;
    }
    let resolved = tokens
        .into_iter()
        .map(|token| {
            if is_identifier(&token) {
                if let Some(resource) = state
                    .entity_state
                    .as_ref()
                    .and_then(|entities| entities.resources.get(&token))
                {
                    return js_number_string(*resource);
                }
                return state
                    .variables
                    .get(&token)
                    .and_then(RuntimeValue::as_number)
                    .map(js_number_string)
                    .unwrap_or_else(|| "0".to_string());
            }
            token
        })
        .collect();
    Parser {
        tokens: resolved,
        index: 0,
    }
    .expression()
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

struct Parser {
    tokens: Vec<String>,
    index: usize,
}

impl Parser {
    fn peek(&self) -> Option<&str> {
        self.tokens.get(self.index).map(String::as_str)
    }

    fn consume(&mut self) -> Option<String> {
        let token = self.tokens.get(self.index).cloned();
        self.index += usize::from(token.is_some());
        token
    }

    fn expression(&mut self) -> f64 {
        let mut result = self.term();
        loop {
            match self.peek() {
                Some("+") => {
                    self.consume();
                    result += self.term();
                }
                Some("-") => {
                    self.consume();
                    result -= self.term();
                }
                _ => break,
            }
        }
        result
    }

    fn term(&mut self) -> f64 {
        let mut result = self.factor();
        loop {
            match self.peek() {
                Some("*") => {
                    self.consume();
                    result *= self.factor();
                }
                Some("/") => {
                    self.consume();
                    let divisor = self.factor();
                    result = if divisor != 0.0 {
                        result / divisor
                    } else {
                        0.0
                    };
                }
                _ => break,
            }
        }
        result
    }

    fn factor(&mut self) -> f64 {
        match self.peek() {
            Some("-") => {
                self.consume();
                -self.factor()
            }
            Some("+") => {
                self.consume();
                self.factor()
            }
            Some("(") => {
                self.consume();
                let value = self.expression();
                if self.peek() == Some(")") {
                    self.consume();
                }
                value
            }
            _ => self
                .consume()
                .and_then(|token| token.parse::<f64>().ok())
                .filter(|value| !value.is_nan())
                .unwrap_or(0.0),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::evaluate;
    use crate::state::{EntityRuntimeState, RuntimeState, RuntimeValue};

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

import type { GraphRuntimeState } from "../types";

export function evaluateFormula(formula: string, state: GraphRuntimeState): number {
  // 1. Tokenize formula string
  const tokenRegex = /\s*([+\-*/()]+|[a-zA-Z_]\w*|\d+(?:\.\d+)?)\s*/g;
  const tokens: string[] = [];
  let match;
  
  while ((match = tokenRegex.exec(formula)) !== null) {
    tokens.push(match[1]);
  }

  if (tokens.length === 0) return 0;

  // 2. Resolve variable tokens to numeric constants
  const resolvedTokens: string[] = tokens.map((token) => {
    if (/^[a-zA-Z_]\w*$/.test(token)) {
      // Check player resources
      const resourceVal = state.entityState?.resources?.[token];
      if (typeof resourceVal === "number") {
        return String(resourceVal);
      }
      // Check global variables
      const globalVal = state.variables?.[token];
      if (typeof globalVal === "number") {
        return String(globalVal);
      }
      // Fallback
      return "0";
    }
    return token;
  });

  // 3. Recursive Descent Parser implementation
  let index = 0;

  function peek(): string | undefined {
    return resolvedTokens[index];
  }

  function consume(): string {
    return resolvedTokens[index++];
  }

  // Expression = Term ( ( "+" | "-" ) Term )*
  function parseExpression(): number {
    let result = parseTerm();
    while (true) {
      const token = peek();
      if (token === "+") {
        consume();
        result += parseTerm();
      } else if (token === "-") {
        consume();
        result -= parseTerm();
      } else {
        break;
      }
    }
    return result;
  }

  // Term = Factor ( ( "*" | "/" ) Factor )*
  function parseTerm(): number {
    let result = parseFactor();
    while (true) {
      const token = peek();
      if (token === "*") {
        consume();
        result *= parseFactor();
      } else if (token === "/") {
        consume();
        const divisor = parseFactor();
        result = divisor !== 0 ? result / divisor : 0; // safe division by zero
      } else {
        break;
      }
    }
    return result;
  }

  // Factor = Number | "(" Expression ")" | "-" Factor | "+" Factor
  function parseFactor(): number {
    const token = peek();
    if (token === "-") {
      consume(); // consume "-"
      return -parseFactor();
    }
    if (token === "+") {
      consume(); // consume "+"
      return parseFactor();
    }
    if (token === "(") {
      consume(); // consume "("
      const result = parseExpression();
      if (peek() === ")") {
        consume(); // consume ")"
      }
      return result;
    }
    
    const val = parseFloat(consume() || "0");
    return isNaN(val) ? 0 : val;
  }

  try {
    return parseExpression();
  } catch {
    return 0;
  }
}

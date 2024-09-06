import { StreamLanguage } from "@codemirror/language";

const createTokenHighlighter = (tokenRegexps: Record<string, RegExp>) =>
  StreamLanguage.define({
    token: (stream, _state) => {
      if (stream.eatSpace()) {
        return null;
      }

      for (const [tokenType, pattern] of Object.entries(tokenRegexps)) {
        if (stream.match(pattern)) {
          return tokenType;
        }
      }

      stream.next();
      return null;
    },
  });

export const cwHighlighter = createTokenHighlighter({
  arithmeticOperator: /^\b[*/%+-]\b/,
  comment: /^;[^\n]*/,
  unit: /^\b(AB|BA|[ABFXI])\b/,
  number: /^[+-]?[0-9]+\b/,
  keyword:
    /^\b(DAT|MOV|ADD|SUB|MUL|DIV|MOD|JMP|JMZ|JMN|DJN|CMP|SLT|SPL|ORG|EQU|END)\b/,
  name: /^\b[a-zA-Z_][a-zA-Z_0-9]*\b/,
  punctuation: /^\./,
  paren: /^\b[()]\b/,
  separator: /^\b,\b/,
  modifier: /^[#$@<>]/,
});

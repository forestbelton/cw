AssemblyFile = lines:Lines? EOF {
    return lines || []
}

Lines = h:Line t:(NL @Line)* {
    return [h, ...t].filter(line => line !== null)
}

Line = WS @Instruction? COMMENT?

Instruction = labels:LabelList? code:OPCODE modifier:('.' @MODIFIER)? WS lhs:Operand? rhs:(',' WS @Operand)? {
    return {
        labels: labels || [],
        code,
        modifier,
        lhs,
        rhs,
    }
}

LabelList = h:LABEL t:(NL? @LABEL)* {
    return [h, ...t]
}

Operand = mode:[#$@<>]? expr:Expr {
    return {
        mode,
        expr,
    }
}

Expr = lhs:MulExpr rhs:([+-] WS MulExpr)* {
    return rhs.reduce((result, element) => ({
        op: element[0],
        lhs: result,
        rhs: element[2],
    }), lhs)
}

MulExpr = lhs:Term rhs:([*/%] WS Term)* {
    return rhs.reduce((result, element) => ({
        op: element[0],
        lhs: result,
        rhs: element[2],
    }), lhs)
}

Term = LABEL / NUMBER / '(' WS @Expr ')' WS

COMMENT = ';' [^\r\n]*

OPCODE = 'DAT' / 'MOV' / 'ADD' / 'SUB' / 'MUL' / 'DIV' / 'MOD'
	/ 'JMP' / 'JMZ' / 'JMN' / 'DJN' / 'CMP' / 'SLT' / 'SPL'
    / 'ORG' / 'EQU' / 'END'

MODIFIER = 'AB' / 'BA' / [ABFXI]

LABEL = !OPCODE @$([a-zA-Z_] [a-zA-Z_0-9]*) WS

NUMBER = digits:$([+-]? [0-9]+) WS {
    return parseInt(digits, 10)
}

WS = [ \t]*

NL = [\r\n]+

EOF = !.

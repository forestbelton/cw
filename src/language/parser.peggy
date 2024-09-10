AssemblyFile = lines:Lines? EOF {
    return lines || []
}

Lines = h:Line t:(NL @Line)* {
    return [h, ...t].filter(line => line !== null)
}

Line = WS @LabeledInstruction? COMMENT?

LabeledInstruction = labels:LabelList? insn:(Instruction / EndInstruction / OrgInstruction) {
    return {
        labels: labels || [],
        ...insn,
    }
}

Instruction = operation:OPCODE modifier:('.' @MODIFIER)? WS a:Operand b:(',' WS @Operand)? {
    return {
        type: null,
        operation,
        modifier,
        a,
        b,
    }
}

EndInstruction = type:'END' WS expr:Expr? {
    return {
        type,
        expr,
    }
}

OrgInstruction = type:'ORG' WS expr:Expr {
    return {
        type,
        expr,
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
    const OP_NAMES = {
        "+": "ADD",
        "-": "SUB",
    }

    return rhs.reduce((result, element) => ({
        op: OP_NAMES[element[0]],
        lhs: result,
        rhs: element[2],
    }), lhs)
}

MulExpr = lhs:Term rhs:([*/%] WS Term)* {
    const OP_NAMES = {
        "*": "MUL",
        "/": "DIV",
        "%": "MOD",
    }

    return rhs.reduce((result, element) => ({
        op: OP_NAMES[element[0]],
        lhs: result,
        rhs: element[2],
    }), lhs)
}

Term = LABEL / NUMBER / '(' WS @Expr ')' WS

COMMENT = ';' [^\r\n]*

OPCODE = 'DAT' / 'MOV' / 'ADD' / 'SUB' / 'MUL' / 'DIV' / 'MOD'
	/ 'JMP' / 'JMZ' / 'JMN' / 'DJN' / 'CMP' / 'SLT' / 'SPL'

MODIFIER = 'AB' / 'BA' / [ABFXI]

LABEL = !(OPCODE / 'ORG' / 'END') @$([a-zA-Z_] [a-zA-Z_0-9]*) WS

NUMBER = digits:$([+-]? [0-9]+) WS {
    return parseInt(digits, 10)
}

WS = [ \t]*

NL = [\r\n]+

EOF = !.

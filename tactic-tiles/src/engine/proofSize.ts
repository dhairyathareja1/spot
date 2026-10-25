import type { ParsedProof, Statement } from './types'

// Counts the lines written. A for loop counts as one line plus its body.
export function proofSize(proof: ParsedProof): number {
  const helperStatements = proof.helpers.reduce((total, helper) => total + blockSize(helper.body), 0)
  return helperStatements + blockSize(proof.body)
}

function blockSize(statements: Statement[]): number {
  return statements.reduce(
    (total, statement) => total + (statement.kind === 'for' ? 1 + blockSize(statement.body) : 1),
    0,
  )
}

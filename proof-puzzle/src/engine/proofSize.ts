import type { ParsedProof } from './types'

export function proofSize(proof: ParsedProof): number {
  const helperStatements = proof.helpers.reduce((total, helper) => total + helper.body.length, 0)
  return helperStatements + proof.body.length
}

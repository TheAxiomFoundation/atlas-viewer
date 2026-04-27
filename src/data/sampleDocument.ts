// Sample document: 26 USC 32 - Earned Income Tax Credit
// This demonstrates the split view with statute text and RuleSpec encoding

export const sampleDocument = {
  citation: '26 USC 32',
  title: 'Earned income',
  subsections: [
    {
      id: 'a',
      text: 'In the case of an eligible individual, there shall be allowed as a credit against the tax imposed by this subtitle for the taxable year an amount equal to the credit percentage of so much of the taxpayer\'s earned income for the taxable year as does not exceed the earned income amount.',
      codeLines: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    {
      id: 'a/1',
      text: 'The term "eligible individual" means any individual who has a qualifying child for the taxable year, or meets the requirements of subparagraph (B).',
      codeLines: [12, 13, 14, 15, 16, 17],
    },
    {
      id: 'a/2',
      text: 'The credit percentage and phaseout percentage shall be determined as follows based on the number of qualifying children.',
      codeLines: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    },
    {
      id: 'b',
      text: 'The credit allowed under subsection (a) for any taxable year shall not exceed the excess (if any) of the credit percentage of the earned income amount, over the phaseout percentage of so much of the adjusted gross income as exceeds the phaseout amount.',
      codeLines: [32, 33, 34, 35, 36, 37, 38, 39],
    },
    {
      id: 'c/1',
      text: 'The term "qualifying child" means, with respect to any taxpayer for any taxable year, an individual who bears a relationship to the taxpayer described in paragraph (2), who has the same principal place of abode as the taxpayer for more than one-half of such taxable year, and who meets the age requirements of paragraph (3).',
      codeLines: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
    },
  ],
  code: `# 26 USC 32 - Earned Income Tax Credit
# Encoded in RuleSpec (Regulatory and Administrative Code)

variable eitc_credit: Money
  entity: TaxUnit
  period: Year
  label: "Earned Income Tax Credit"
  reference: "26 USC 32(a)"

variable eligible_individual: Boolean
  entity: Person
  period: Year
  label: "Eligible individual for EITC"
  reference: "26 USC 32(a)(1)"

formula eligible_individual:
  has_qualifying_child or meets_eitc_requirements

parameter eitc_credit_rate: Rate
  reference: "26 USC 32(a)(2)"
  values:
    2024-01-01:
      0: 0.0765   # No qualifying children
      1: 0.34     # One qualifying child
      2: 0.40     # Two qualifying children
      3: 0.45     # Three or more children

formula eitc_credit:
  earned_income = taxpayer.earned_income
  credit_rate = eitc_credit_rate[qualifying_children]

  phase_in = min(earned_income, earned_income_amount) * credit_rate
  phase_out = max(0, agi - phaseout_threshold) * phaseout_rate

  return max(0, phase_in - phase_out)

variable qualifying_child: Boolean
  entity: Person
  period: Year
  label: "Qualifying child for EITC"
  reference: "26 USC 32(c)(1)"

formula qualifying_child:
  relationship_test = is_child or is_sibling or is_descendant
  residency_test = shared_residence_months > 6
  age_test = age < 19 or (age < 24 and is_student)

  return relationship_test and residency_test and age_test`,
}

# Script to calculate Capital Gains from Stock Trade records

Designed to be used with the **Stake** trading platform at first

## Get Started

- The startup code is in the `index.ts` file. This file has an unopened function, which is designed to run the calculation on the Google script sheet it's tied to on open. It also adds a manual manual item called calculate capital gains to the script sheet navbar.

- The file called `capital-gains.ts` has the logic, which runs through the rows of stock trades to calculate Capital gains on each stock in the list for each financial year.

## Docs

- Apps Script Typescript https://developers.google.com/apps-script/guides/typescript
- clasp cli - https://github.com/google/clasp
- clasp run https://github.com/google/clasp/blob/master/docs/run.md
- Examples & ready slns - https://github.com/gsuitedevs/solutions/tree/master

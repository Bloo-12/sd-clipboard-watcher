import chalk from "chalk";

export function printCLIOptions(useSpacer = true) {
  if (useSpacer) {
    console.log(`\n\n`)
  }
  console.log(chalk.blue(`Press o to set options`));
  console.log(chalk.blue(`Press w to toggle watch mode`));
  console.log(chalk.blue(`Press s to submit the last paste to SD`));
}

export function delay(ms) { return new Promise(res => setTimeout(res, ms)) };
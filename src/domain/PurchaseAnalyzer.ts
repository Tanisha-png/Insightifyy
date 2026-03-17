export type PurchaseCategory = 'Need' | 'Want';

export type PurchaseVerdict = 'Good Purchase' | 'Bad Purchase';

export type PurchaseStrategy =
  | 'Buy Outright with Rewards Card'
  | 'Wait 30 Days'
  | 'Search for a 0% Interest Payment Plan'
  | 'Buy Now, Pay Later (0%)';

export type PurchaseAnalysis = {
  verdict: PurchaseVerdict;
  strategies: PurchaseStrategy[];
  reasons: string[];
  pathToYes?: PathToYes;
};

export type PathToYes = {
  shortfall: number;
  monthlySave: number;
  monthsToSafeBuy: number;
  safeBuyDateIso: string;
  message: string;
};

export type PurchaseAnalyzerInput = {
  purchaseAmount: number;
  purchaseCategory: PurchaseCategory;
  isEmergency: boolean;

  liquidSavings: number;
  monthlyEssentialExpenses: number;
  monthlySurplus: number;

  hasRewardsCard: boolean;
  canPayStatementInFull: boolean;

  bnplIs0Percent: boolean;
};

export class PurchaseAnalyzer {
  analyze(input: PurchaseAnalyzerInput): PurchaseAnalysis {
    const reasons: string[] = [];
    const strategies: PurchaseStrategy[] = [];

    const purchaseAmount = clampNonNegative(input.purchaseAmount);
    const liquidSavings = clampNonNegative(input.liquidSavings);
    const monthlyExpenses = clampNonNegative(input.monthlyEssentialExpenses);
    const monthlySurplus = clampNonNegative(input.monthlySurplus);

    const purchasePctOfSavings =
      liquidSavings > 0 ? purchaseAmount / liquidSavings : Number.POSITIVE_INFINITY;

    const savingsAfter = liquidSavings - purchaseAmount;
    const emergencyFundFloor = 3 * monthlyExpenses;

    // Rule D (Emergency Fund Shield)
    if (!input.isEmergency && savingsAfter < emergencyFundFloor) {
      reasons.push(
        'This purchase would drop your liquid savings below ~3 months of essential expenses.'
      );
      return badWithPath({
        reasons,
        strategies: [],
        liquidSavings,
        monthlyExpenses,
        purchaseAmount,
        monthlySurplus,
      });
    }

    // Rule B (Interest Trap)
    if (!input.canPayStatementInFull) {
      reasons.push("If you can't pay the statement in full, interest can erase any upside.");
      strategies.push('Wait 30 Days', 'Search for a 0% Interest Payment Plan');
      return badWithPath({
        reasons,
        strategies: uniqueStrategies(strategies),
        liquidSavings,
        monthlyExpenses,
        purchaseAmount,
        monthlySurplus,
      });
    }

    // Rule A (Cash-is-King)
    if (purchasePctOfSavings < 0.05 && input.hasRewardsCard) {
      reasons.push('This is under 5% of your liquid savings, and you can earn rewards.');
      strategies.push('Buy Outright with Rewards Card');
    }

    // Rule C (BNPL/Installment)
    if (input.bnplIs0Percent && input.purchaseCategory === 'Need') {
      reasons.push('0% installments can preserve cash flow for a true need.');
      strategies.push('Buy Now, Pay Later (0%)');
    }

    if (strategies.length === 0) {
      reasons.push('No risk flags triggered, but the best move depends on your priorities.');
      strategies.push('Buy Outright with Rewards Card');
    }

    return {
      verdict: 'Good Purchase',
      strategies: uniqueStrategies(strategies),
      reasons,
    };
  }
}

function badWithPath(params: {
  reasons: string[];
  strategies: PurchaseStrategy[];
  liquidSavings: number;
  monthlyExpenses: number;
  purchaseAmount: number;
  monthlySurplus: number;
}): PurchaseAnalysis {
  const pathToYes = computePathToYes({
    liquidSavings: params.liquidSavings,
    monthlyExpenses: params.monthlyExpenses,
    purchaseAmount: params.purchaseAmount,
    monthlySurplus: params.monthlySurplus,
  });

  return {
    verdict: 'Bad Purchase',
    strategies: params.strategies,
    reasons: params.reasons,
    pathToYes,
  };
}

function computePathToYes(params: {
  liquidSavings: number;
  monthlyExpenses: number;
  purchaseAmount: number;
  monthlySurplus: number;
}): PathToYes | undefined {
  const target = 3 * params.monthlyExpenses + params.purchaseAmount;
  const shortfall = Math.max(0, target - params.liquidSavings);

  if (shortfall <= 0) return undefined;

  if (params.monthlySurplus <= 0) {
    const message =
      "Not today, but you're on the path! With a $0 monthly surplus, there's no safe timeline yet—reduce expenses or increase income to create surplus.";
    return {
      shortfall,
      monthlySave: 0,
      monthsToSafeBuy: Number.POSITIVE_INFINITY,
      safeBuyDateIso: '',
      message,
    };
  }

  const monthsToSafeBuy = Math.max(1, Math.ceil(shortfall / params.monthlySurplus));
  const safeBuyDate = addMonths(new Date(), monthsToSafeBuy);
  const safeBuyDateIso = safeBuyDate.toISOString().slice(0, 10);

  const monthlySave = Math.min(params.monthlySurplus, shortfall);
  const message = `Not today, but you're on the path! Based on your surplus, you can safely buy this on ${safeBuyDateIso} if you save $${round2(
    monthlySave
  )} per month.`;

  return {
    shortfall: round2(shortfall),
    monthlySave: round2(monthlySave),
    monthsToSafeBuy,
    safeBuyDateIso,
    message,
  };
}

function uniqueStrategies(strategies: PurchaseStrategy[]): PurchaseStrategy[] {
  return Array.from(new Set(strategies));
}

function clampNonNegative(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function addMonths(d: Date, months: number): Date {
  const copy = new Date(d.getTime());
  const day = copy.getDate();
  copy.setMonth(copy.getMonth() + months);

  // Handle month rollover (e.g., Jan 31 -> Feb)
  if (copy.getDate() < day) {
    copy.setDate(0);
  }
  return copy;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}


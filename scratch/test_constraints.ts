import { generateMealPlan } from '../src/lib/ai/generateMealPlan';

async function test() {
  const catalog = [
    { id: '1', name: 'Fresh Chicken Cuts (1kg)', category: 'meat', unit: 'kg', basePrice: 220, imageUrl: null },
    { id: '2', name: 'Farm Fresh Eggs (dozen)', category: 'dairy', unit: 'each', basePrice: 110, imageUrl: null },
    { id: '3', name: 'Potatoes (1kg)', category: 'produce', unit: 'kg', basePrice: 95, imageUrl: null },
    { id: '4', name: 'Native Garlic (500g)', category: 'produce', unit: 'each', basePrice: 80, imageUrl: null },
    { id: '5', name: 'Red Onions (1kg)', category: 'produce', unit: 'kg', basePrice: 140, imageUrl: null },
    { id: '6', name: 'Fresh Kangkong (bundle)', category: 'produce', unit: 'bundle', basePrice: 35, imageUrl: null },
  ];

  const results = await generateMealPlan({
    prompt: 'quick 15 minute chicken meal for dinner',
    dietaryTag: 'Quick',
    servings: 2,
    budgetLimit: 500
  }, catalog);

  const totalCost = results.reduce((sum, r) => sum + r.estimatedCost, 0);
  console.log('--- TEST RESULTS ---');
  console.log('Recipe Count:', results.length);
  results.forEach((r, i) => {
    console.log(`Recipe ${i+1}: ${r.title} | Prep: ${r.prepTimeMinutes}m | Cook: ${r.cookTimeMinutes}m | Cost: P${r.estimatedCost}`);
  });
  console.log('Total Plan Cost: P' + totalCost);
  console.log('Budget Limit Check (<= P500):', totalCost <= 500 ? 'PASS OK' : 'FAIL');
  console.log('Cooking Time Check (<= 15m):', results.every(r => r.cookTimeMinutes <= 15) ? 'PASS OK' : 'FAIL');
}

test();
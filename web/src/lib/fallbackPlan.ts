
interface FormData {
    familySize: string;
    dailyBudget: string;
    days: string;
    cuisineType: string;
    ageGroups: string;
    healthGoals: string;
    dietaryNotes: string;
    likedFoods: string;
    avoidFoods: string;
    city?: string;
    country?: string;
}

export function generateFallbackPlan(formData: FormData): string {
    const days = parseInt(formData.days) || 7;
    let plan = "";

    for (let i = 1; i <= days; i++) {
        plan += `# Day ${i}\n\n`;

        plan += `## Suhoor\n`;
        plan += `- Oatmeal with dates and milk (High energy, slow release)\n`;
        plan += `- 2 Boiled eggs (Protein source)\n`;
        plan += `- Handful of mixed nuts (Healthy fats)\n`;
        plan += `- Plenty of water\n\n`;

        plan += `## Iftar\n`;
        plan += `- 3 Dates and water to break fast\n`;
        plan += `- Fruit chaat with seasonal fruits\n`;
        plan += `- Grilled Chicken with mixed vegetables\n`;
        plan += `- Lentil soup (Hydration and protein)\n`;
        plan += `- Rice or whole wheat Roti\n\n`;

        plan += `## Preparation\n`;
        plan += `- Soak oats overnight for quick Suhoor\n`;
        plan += `- Marinate chicken 2 hours before Iftar\n`;
        plan += `- Boil eggs previous night to save time\n\n`;

        plan += `## Shopping List\n`;
        plan += `- Dates\n`;
        plan += `- Milk\n`;
        plan += `- Eggs\n`;
        plan += `- Chicken\n`;
        plan += `- Seasonal Fruits\n`;
        plan += `- Lentils\n`;
        plan += `- Rice/Flour\n\n`;
    }

    return plan;
}

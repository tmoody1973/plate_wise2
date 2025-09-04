import type { Ingredient } from '@/types'

type PriceMap = {
  perKg?: Record<string, number>
  perEach?: Record<string, number>
  perLiter?: Record<string, number>
}

const PRICE_MAP: PriceMap = {
  perKg: {
    // Fresh vegetables
    onion: 4.4,
    'yellow onion': 4.4,
    'white onion': 4.4,
    'red onion': 5.5,
    'green onion': 8.8,
    'scallion': 8.8,
    carrot: 3.8,
    'baby carrots': 5.5,
    tomato: 6.6,
    'roma tomato': 6.6,
    'cherry tomatoes': 11.0,
    'grape tomatoes': 11.0,
    'plum tomatoes': 7.7,
    'heirloom tomatoes': 13.2,
    celery: 5.5,
    'bell pepper': 8.8,
    'red bell pepper': 8.8,
    'green bell pepper': 7.7,
    'yellow bell pepper': 8.8,
    'orange bell pepper': 8.8,
    'pepper': 8.8,
    'jalapeño': 11.0,
    'serrano pepper': 13.2,
    'poblano pepper': 11.0,
    'habanero': 22.0,
    potato: 3.3,
    'russet potato': 3.3,
    'red potato': 4.4,
    'yukon potato': 4.4,
    'sweet potato': 5.5,
    'baby potato': 6.6,
    garlic: 15.4,
    'garlic, minced': 15.4,
    'minced garlic': 15.4,
    'fresh garlic': 15.4,
    'garlic powder': 22.0,
    ginger: 13.2,
    'fresh ginger': 13.2,
    'ground ginger': 44.0,
    
    // Citrus fruits
    lemon: 6.6,
    'meyer lemon': 8.8,
    lime: 7.7,
    'key lime': 11.0,
    orange: 5.5,
    'navel orange': 5.5,
    grapefruit: 4.4,
    
    // Leafy greens
    spinach: 11.0,
    'baby spinach': 13.2,
    kale: 8.8,
    'baby kale': 11.0,
    lettuce: 6.6,
    'romaine lettuce': 6.6,
    'iceberg lettuce': 5.5,
    'mixed greens': 13.2,
    arugula: 15.4,
    
    // Herbs (fresh)
    basil: 44.0,
    'fresh basil': 44.0,
    oregano: 44.0,
    'fresh oregano': 44.0,
    parsley: 22.0,
    'fresh parsley': 22.0,
    cilantro: 22.0,
    'fresh cilantro': 22.0,
    thyme: 44.0,
    'fresh thyme': 44.0,
    rosemary: 44.0,
    'fresh rosemary': 44.0,
    sage: 44.0,
    'fresh sage': 44.0,
    dill: 33.0,
    'fresh dill': 33.0,
    mint: 33.0,
    'fresh mint': 33.0,
    
    // Proteins - Poultry
    chicken: 15.4,
    'whole chicken': 8.8,
    'chicken breast': 19.8,
    'chicken thighs': 13.2,
    'chicken wings': 11.0,
    'chicken drumsticks': 9.9,
    'rotisserie chicken': 13.2,
    'chicken tenderloins': 22.0,
    turkey: 17.6,
    'ground turkey': 15.4,
    'turkey breast': 22.0,
    
    // Proteins - Beef
    beef: 28.6,
    'ground beef': 17.6,
    'beef stew meat': 22.0,
    'chuck roast': 19.8,
    'ribeye steak': 44.0,
    'sirloin steak': 33.0,
    'filet mignon': 66.0,
    'beef brisket': 22.0,
    'flank steak': 26.4,
    'skirt steak': 24.2,
    
    // Proteins - Pork
    pork: 13.2,
    'ground pork': 11.0,
    'pork chops': 15.4,
    'pork shoulder': 11.0,
    'pork tenderloin': 17.6,
    bacon: 22.0,
    ham: 17.6,
    'pork belly': 19.8,
    sausage: 15.4,
    'italian sausage': 17.6,
    
    // Seafood
    salmon: 44.0,
    'atlantic salmon': 44.0,
    'pacific salmon': 48.4,
    tuna: 33.0,
    'yellowfin tuna': 44.0,
    cod: 26.4,
    'mahi mahi': 35.2,
    shrimp: 33.0,
    'jumbo shrimp': 44.0,
    crab: 55.0,
    lobster: 66.0,
    scallops: 55.0,
    mussels: 11.0,
    clams: 13.2,
    
    // Grains & Starches
    rice: 4.4,
    'cooked rice': 6.6,
    'white rice': 4.4,
    'brown rice': 5.5,
    'jasmine rice': 6.6,
    'basmati rice': 7.7,
    'wild rice': 11.0,
    quinoa: 13.2,
    'tri-color quinoa': 15.4,
    pasta: 2.2,
    'whole wheat pasta': 3.3,
    'penne pasta': 2.2,
    'spaghetti': 2.2,
    'linguine': 2.2,
    'fettuccine': 2.2,
    couscous: 6.6,
    bulgur: 5.5,
    barley: 4.4,
    oats: 3.3,
    'rolled oats': 3.3,
    'steel cut oats': 4.4,
    
    // Legumes
    beans: 4.4,
    'black beans': 4.4,
    'pinto beans': 4.4,
    'navy beans': 4.4,
    'kidney beans': 4.4,
    'white beans': 4.4,
    'cannellini beans': 5.5,
    'chickpeas': 5.5,
    'garbanzo beans': 5.5,
    lentils: 6.6,
    'red lentils': 6.6,
    'green lentils': 6.6,
    'black lentils': 7.7,
    'split peas': 4.4,
    
    // Baking & Pantry
    flour: 2.2,
    'all-purpose flour': 2.2,
    'bread flour': 3.3,
    'cake flour': 3.3,
    'wheat flour': 3.3,
    'almond flour': 22.0,
    'coconut flour': 15.4,
    sugar: 2.2,
    'brown sugar': 2.2,
    'powdered sugar': 3.3,
    'coconut sugar': 8.8,
    honey: 11.0,
    'maple syrup': 22.0,
    'agave nectar': 13.2,
    
    // Dairy & Alternatives
    butter: 17.6,
    'unsalted butter': 17.6,
    'salted butter': 17.6,
    'vegan butter': 22.0,
    cheese: 22.0,
    'cheddar cheese': 22.0,
    'mozzarella cheese': 19.8,
    'swiss cheese': 24.2,
    'goat cheese': 33.0,
    'feta cheese': 26.4,
    'cream cheese': 17.6,
    'ricotta cheese': 13.2,
    'cottage cheese': 8.8,
    'parmesan cheese': 33.0,
    'pecorino romano': 35.2,
    'blue cheese': 28.6,
    'brie cheese': 33.0,
    'gruyere cheese': 44.0,
    
    // Condiments & Sauces
    salt: 1.1,
    'sea salt': 4.4,
    'kosher salt': 2.2,
    'himalayan salt': 11.0,
    'black pepper': 44.0,
    'white pepper': 48.4,
    'cayenne pepper': 33.0,
    'paprika': 22.0,
    'chili powder': 22.0,
    'cumin': 33.0,
    'coriander': 28.6,
    'turmeric': 22.0,
    'cinnamon': 22.0,
    'nutmeg': 44.0,
    'cardamom': 110.0,
    'saffron': 2200.0,
    'vanilla extract': 220.0,
    
    // Oils & Fats
    oil: 11.0,
    'vegetable oil': 8.8,
    'olive oil': 26.4,
    'olive oil extra virgin': 30.0,
    'coconut oil': 17.6,
    'avocado oil': 33.0,
    'sesame oil': 26.4,
    'sunflower oil': 8.8,
    'canola oil': 7.7,
    'cooking oil': 8.8,
    'peanut oil': 13.2,
    
    // Condiments
    ketchup: 6.6,
    'tomato ketchup': 6.6,
    mustard: 5.5,
    'dijon mustard': 8.8,
    'whole grain mustard': 11.0,
    mayonnaise: 8.8,
    'vegan mayo': 13.2,
    'soy sauce': 8.8,
    'tamari': 13.2,
    'sriracha': 11.0,
    'hot sauce': 11.0,
    'worcestershire sauce': 11.0,
    'balsamic vinegar': 15.4,
    'apple cider vinegar': 8.8,
    'white vinegar': 3.3,
    'rice vinegar': 11.0,
    'red wine vinegar': 11.0,
    
    // Specialty ingredients
    'anchovy fillets': 44.0,
    'anchovies': 44.0,
    'capers': 33.0,
    'olives': 15.4,
    'kalamata olives': 22.0,
    'green olives': 13.2,
    'sun-dried tomatoes': 44.0,
    'roasted red peppers': 22.0,
    'artichoke hearts': 15.4,
    'pine nuts': 88.0,
    'walnuts': 22.0,
    'pecans': 33.0,
    'almonds': 19.8,
    'cashews': 26.4,
    'pistachios': 35.2,
    'peanuts': 11.0,
    'sesame seeds': 15.4,
    'pumpkin seeds': 17.6,
    'sunflower seeds': 11.0,
    
    // Canned goods
    'canned tomatoes': 4.4,
    'diced tomatoes': 4.4,
    'crushed tomatoes': 4.4,
    'tomato paste': 8.8,
    'tomato sauce': 3.3,
    'coconut milk': 6.6,
    'evaporated milk': 5.5,
    'condensed milk': 8.8,
    
    // Frozen items
    'frozen peas': 4.4,
    'frozen corn': 3.3,
    'frozen broccoli': 5.5,
    'frozen spinach': 6.6,
    'frozen berries': 11.0,
    'frozen shrimp': 26.4,
    
    // Additional specialty items
    'lemon juice': 11.0,
    'lime juice': 13.2,
    'coconut flakes': 13.2,
    'bread crumbs': 6.6,
    'panko': 8.8,
    'cornstarch': 4.4,
    'baking powder': 11.0,
    'baking soda': 2.2,
    'yeast': 22.0,
    'gelatin': 33.0,
  },
  perEach: {
    // Eggs and egg products
    egg: 0.5,
    'large egg': 0.5,
    'medium egg': 0.45,
    'small egg': 0.4,
    'jumbo egg': 0.6,
    'egg yolk': 0.25, // Half the cost of a whole egg since you use half
    'egg white': 0.25, // Same logic
    'quail egg': 0.8,
    
    // Individual fruits
    lemon: 1.2,
    'meyer lemon': 1.5,
    lime: 0.8,
    'key lime': 0.5,
    orange: 1.0,
    'navel orange': 1.2,
    'blood orange': 1.5,
    grapefruit: 1.8,
    apple: 1.0,
    'granny smith apple': 1.2,
    'honeycrisp apple': 1.5,
    'gala apple': 1.0,
    pear: 1.3,
    'bartlett pear': 1.5,
    'anjou pear': 1.4,
    banana: 0.3,
    'plantain': 1.2,
    avocado: 2.0,
    'hass avocado': 2.2,
    mango: 2.5,
    pineapple: 5.0,
    
    // Individual vegetables
    onion: 0.8,
    'yellow onion': 0.8,
    'white onion': 0.8,
    'red onion': 1.0,
    'sweet onion': 1.2,
    'bell pepper': 2.5,
    'red bell pepper': 2.5,
    'green bell pepper': 2.0,
    'yellow bell pepper': 2.5,
    'orange bell pepper': 2.5,
    'jalapeño': 0.3,
    'serrano pepper': 0.2,
    'poblano pepper': 1.5,
    'habanero': 0.5,
    tomato: 1.5,
    'roma tomato': 1.2,
    'beefsteak tomato': 2.5,
    'heirloom tomato': 3.0,
    potato: 0.6,
    'russet potato': 0.6,
    'red potato': 0.7,
    'yukon potato': 0.8,
    'sweet potato': 1.2,
    'baby potato': 0.3,
    carrot: 0.4,
    'baby carrot': 0.1,
    'large carrot': 0.8,
    'english cucumber': 2.0,
    'persian cucumber': 1.0,
    'pickling cucumber': 0.5,
    zucchini: 1.5,
    'yellow squash': 1.5,
    'butternut squash': 4.0,
    'acorn squash': 3.0,
    'spaghetti squash': 3.5,
    eggplant: 3.0,
    'japanese eggplant': 2.0,
    'chinese eggplant': 2.5,
    
    // Garlic and aromatics
    'garlic clove': 0.1,
    'garlic': 0.1,
    'garlic bulb': 1.5,
    'shallot': 0.8,
    'green onion': 0.2,
    'scallion': 0.2,
    
    // Mushrooms
    'white mushroom': 0.5,
    'baby bella mushroom': 0.6,
    'portobello mushroom': 2.5,
    'shiitake mushroom': 1.2,
    'cremini mushroom': 0.6,
    'oyster mushroom': 1.5,
    
    // Specialty individual items
    'anchovy fillet': 0.8,
    'caper': 0.05,
    'olive': 0.1,
    'kalamata olive': 0.15,
    'artichoke': 3.0,
    'baby artichoke': 1.5,
    'corn on the cob': 1.0,
    'ear of corn': 1.0,
    
    // Juice portions (from whole fruit)
    'lemon juice': 0.1, // Small portion of a whole lemon
    'lime juice': 0.08, // Small portion of a whole lime
    'orange juice': 0.15, // Small portion of an orange
    
    // Fresh herb bunches
    'basil bunch': 3.0,
    'cilantro bunch': 2.0,
    'parsley bunch': 2.0,
    'mint bunch': 2.5,
    'dill bunch': 2.5,
    'thyme sprig': 0.3,
    'rosemary sprig': 0.3,
    'sage leaf': 0.2,
    
    // Baking items (individual portions)
    'vanilla bean': 4.0,
    'cinnamon stick': 0.5,
    'bay leaf': 0.1,
    'whole nutmeg': 1.0,
    'cardamom pod': 0.2,
  },
  perLiter: {
    // Dairy liquids
    milk: 1.0,
    'whole milk': 1.0,
    '2% milk': 1.0,
    '1% milk': 1.0,
    'skim milk': 1.0,
    'almond milk': 3.0,
    'oat milk': 4.0,
    'soy milk': 2.5,
    'coconut milk': 3.5,
    'rice milk': 3.0,
    'heavy cream': 8.0,
    'half and half': 4.0,
    'buttermilk': 2.5,
    'sour cream': 6.0,
    yogurt: 4.0,
    'greek yogurt': 8.0,
    
    // Oils and cooking liquids
    oil: 6.0,
    'vegetable oil': 5.5,
    'olive oil': 12.0,
    'extra virgin olive oil': 15.0,
    'coconut oil': 10.0,
    'avocado oil': 18.0,
    'sesame oil': 15.0,
    'sunflower oil': 5.5,
    'canola oil': 4.5,
    'cooking oil': 5.5,
    'peanut oil': 8.0,
    
    // Vinegars
    'balsamic vinegar': 12.0,
    'apple cider vinegar': 6.0,
    'white vinegar': 2.5,
    'rice vinegar': 8.0,
    'red wine vinegar': 8.0,
    'white wine vinegar': 8.0,
    
    // Liquid seasonings
    'soy sauce': 6.0,
    'tamari': 8.0,
    'fish sauce': 10.0,
    'worcestershire sauce': 8.0,
    'hot sauce': 8.0,
    'sriracha': 7.0,
    
    // Broths and stocks
    'chicken broth': 3.0,
    'beef broth': 3.5,
    'vegetable broth': 3.0,
    'bone broth': 12.0,
    'chicken stock': 3.5,
    'beef stock': 4.0,
    'vegetable stock': 3.5,
    
    // Wine and alcohol for cooking
    'white wine': 15.0,
    'red wine': 15.0,
    'cooking wine': 8.0,
    'sake': 25.0,
    'mirin': 18.0,
    'sherry': 20.0,
    'brandy': 35.0,
    'rum': 30.0,
    'vodka': 25.0,
    
    // Juices
    'orange juice': 4.0,
    'lemon juice': 8.0,
    'lime juice': 10.0,
    'apple juice': 3.5,
    'cranberry juice': 5.0,
    'pomegranate juice': 12.0,
    
    // Other liquids
    water: 0,
    'sparkling water': 2.0,
    'coconut water': 8.0,
    'tomato juice': 3.0,
    'clam juice': 6.0,
  },
}

const GRAMS_PER_EACH: Record<string, number> = {
  // Vegetables
  onion: 150,
  'yellow onion': 150,
  'white onion': 150,
  'red onion': 140,
  'sweet onion': 180,
  carrot: 60,
  'baby carrot': 8,
  'large carrot': 120,
  tomato: 120,
  'roma tomato': 100,
  'beefsteak tomato': 200,
  'heirloom tomato': 250,
  'cherry tomato': 15,
  'grape tomato': 12,
  'bell pepper': 120,
  'red bell pepper': 120,
  'green bell pepper': 110,
  'yellow bell pepper': 120,
  'orange bell pepper': 120,
  'jalapeño': 15,
  'serrano pepper': 8,
  'poblano pepper': 80,
  'habanero': 10,
  potato: 170,
  'russet potato': 180,
  'red potato': 150,
  'yukon potato': 160,
  'sweet potato': 200,
  'baby potato': 40,
  garlic: 3, // clove
  'garlic clove': 3,
  'garlic bulb': 45,
  shallot: 30,
  'green onion': 15,
  scallion: 15,
  
  // Mushrooms
  'white mushroom': 20,
  'baby bella mushroom': 25,
  'portobello mushroom': 85,
  'shiitake mushroom': 30,
  'cremini mushroom': 25,
  'oyster mushroom': 40,
  
  // Squash
  zucchini: 200,
  'yellow squash': 200,
  'butternut squash': 1000,
  'acorn squash': 800,
  'spaghetti squash': 1200,
  eggplant: 450,
  'japanese eggplant': 300,
  'chinese eggplant': 350,
  
  // Cucumbers
  'english cucumber': 300,
  'persian cucumber': 150,
  'pickling cucumber': 80,
  
  // Artichokes
  artichoke: 150,
  'baby artichoke': 75,
  
  // Corn
  'corn on the cob': 150,
  'ear of corn': 150,
  
  // Eggs
  egg: 50,
  'large egg': 50,
  'medium egg': 45,
  'small egg': 40,
  'jumbo egg': 60,
  'quail egg': 10,
  
  // Citrus fruits
  lemon: 90,
  'meyer lemon': 100,
  lime: 70,
  'key lime': 30,
  orange: 180,
  'navel orange': 200,
  'blood orange': 170,
  grapefruit: 400,
  
  // Other fruits
  apple: 150,
  'granny smith apple': 160,
  'honeycrisp apple': 180,
  'gala apple': 140,
  pear: 180,
  'bartlett pear': 200,
  'anjou pear': 190,
  banana: 120,
  plantain: 200,
  avocado: 150,
  'hass avocado': 160,
  mango: 300,
  pineapple: 1500,
  
  // Individual spices and seasonings
  'vanilla bean': 5,
  'cinnamon stick': 3,
  'bay leaf': 0.5,
  'whole nutmeg': 8,
  'cardamom pod': 0.3,
  
  // Fresh herb bunches
  'basil bunch': 25,
  'cilantro bunch': 30,
  'parsley bunch': 30,
  'mint bunch': 25,
  'dill bunch': 25,
  'thyme sprig': 2,
  'rosemary sprig': 3,
  'sage leaf': 0.5,
}

const GRAMS_PER_CUP: Record<string, number> = {
  // Fresh vegetables (chopped/diced)
  onion: 160,
  'yellow onion': 160,
  'white onion': 160,
  'red onion': 160,
  'green onion': 100,
  scallion: 100,
  carrot: 128,
  'baby carrots': 128,
  tomato: 180,
  'roma tomato': 180,
  'cherry tomatoes': 150,
  'grape tomatoes': 150,
  celery: 101,
  'bell pepper': 150,
  'red bell pepper': 150,
  'green bell pepper': 150,
  'yellow bell pepper': 150,
  'jalapeño': 90,
  potato: 210,
  'russet potato': 210,
  'sweet potato': 200,
  garlic: 136, // minced
  'minced garlic': 136,
  ginger: 96,
  'fresh ginger': 96,
  
  // Leafy greens
  spinach: 30, // fresh, packed
  'baby spinach': 30,
  kale: 67, // chopped
  lettuce: 47, // chopped
  'romaine lettuce': 47,
  arugula: 20,
  
  // Fresh herbs
  basil: 24, // chopped
  'fresh basil': 24,
  parsley: 60, // chopped
  'fresh parsley': 60,
  cilantro: 16, // chopped
  'fresh cilantro': 16,
  
  // Mushrooms
  'white mushroom': 70, // sliced
  'baby bella mushroom': 70,
  'shiitake mushroom': 65,
  'cremini mushroom': 70,
  
  // Squash and cucumbers
  zucchini: 124, // diced
  'yellow squash': 124,
  'butternut squash': 245, // cubed
  cucumber: 119, // diced
  
  // Grains and starches
  rice: 185, // uncooked white rice
  'white rice': 185,
  'brown rice': 195,
  'jasmine rice': 185,
  'basmati rice': 185,
  'wild rice': 160,
  quinoa: 170, // uncooked
  pasta: 100, // dry
  'cooked pasta': 220,
  oats: 80, // rolled oats
  'rolled oats': 80,
  'steel cut oats': 170,
  couscous: 175,
  bulgur: 140,
  barley: 200, // pearl barley
  
  // Legumes
  beans: 175, // cooked
  'black beans': 175,
  'pinto beans': 175,
  'kidney beans': 175,
  'white beans': 175,
  'cannellini beans': 175,
  chickpeas: 164, // cooked
  'garbanzo beans': 164,
  lentils: 200, // cooked
  'red lentils': 200,
  'green lentils': 200,
  'split peas': 200,
  
  // Baking ingredients
  flour: 120, // all-purpose
  'all-purpose flour': 120,
  'bread flour': 120,
  'cake flour': 115,
  'wheat flour': 120,
  'almond flour': 96,
  'coconut flour': 112,
  sugar: 200, // granulated
  'brown sugar': 220, // packed
  'powdered sugar': 120,
  'coconut sugar': 180,
  honey: 340,
  'maple syrup': 315,
  
  // Fats
  butter: 227, // 1 cup ≈ 227g
  oil: 218, // ≈218g
  'olive oil': 218,
  'vegetable oil': 218,
  'coconut oil': 218, // melted
  
  // Dairy and cheese
  milk: 240, // ml = g for milk
  'heavy cream': 240,
  'sour cream': 240,
  yogurt: 240,
  'greek yogurt': 240,
  cheese: 113, // shredded cheddar
  'cheddar cheese': 113,
  'mozzarella cheese': 113,
  'parmesan cheese': 100, // grated
  'feta cheese': 150, // crumbled
  'goat cheese': 150, // crumbled
  'cream cheese': 225, // softened
  'ricotta cheese': 250,
  'cottage cheese': 225,
  
  // Nuts and seeds
  almonds: 95, // sliced
  walnuts: 100, // chopped
  pecans: 99, // chopped
  cashews: 112,
  peanuts: 146,
  'pine nuts': 135,
  'sesame seeds': 144,
  'sunflower seeds': 140,
  'pumpkin seeds': 64,
  
  // Dried fruits
  raisins: 165,
  'dried cranberries': 120,
  dates: 147, // chopped
  
  // Canned/jarred items
  'canned tomatoes': 240,
  'diced tomatoes': 240,
  'crushed tomatoes': 240,
  'tomato paste': 240,
  'coconut milk': 240,
  
  // Frozen vegetables
  'frozen peas': 145,
  'frozen corn': 165,
  'frozen broccoli': 85,
  'frozen spinach': 190, // thawed and drained
  
  // Breadcrumbs and coatings
  'bread crumbs': 110,
  panko: 50,
  
  // Specialty items
  'sun-dried tomatoes': 54, // chopped
  olives: 140, // sliced
  capers: 142,
  'coconut flakes': 80,
  
  // Powders and starches
  cornstarch: 120,
  'baking powder': 200,
  'baking soda': 220,
  'cocoa powder': 85,
}

function matchKey(name: string, dict: Record<string, any>): string | undefined {
  const lower = name.toLowerCase().trim()
  
  // First try exact match
  if (dict[lower]) return lower
  
  // Handle common variations and plurals for eggs
  if (lower.includes('egg yolk') || lower === 'yolk' || lower === 'yolks') {
    if (dict['egg yolk']) return 'egg yolk'
  }
  if (lower.includes('egg white') || lower === 'white' || lower === 'whites') {
    if (dict['egg white']) return 'egg white'
  }
  if (lower.includes('large egg') || lower === 'large eggs') {
    if (dict['large egg']) return 'large egg'
    if (dict['egg']) return 'egg'
  }
  
  // Handle citrus juice - people buy whole fruits
  if (lower.includes('lemon juice') || lower === 'lemon juice') {
    if (dict['lemon juice']) return 'lemon juice'
    if (dict['lemon']) return 'lemon' // fallback to whole lemon
  }
  if (lower.includes('lime juice') || lower === 'lime juice') {
    if (dict['lime juice']) return 'lime juice'  
    if (dict['lime']) return 'lime' // fallback to whole lime
  }
  if (lower.includes('orange juice') || lower === 'orange juice') {
    if (dict['orange juice']) return 'orange juice'
    if (dict['orange']) return 'orange'
  }
  
  // Handle garlic variations
  if (lower.includes('garlic clove') || lower.includes('clove of garlic')) {
    if (dict['garlic clove']) return 'garlic clove'
    if (dict['garlic']) return 'garlic'
  }
  if (lower.includes('minced garlic') || lower.includes('garlic, minced')) {
    if (dict['minced garlic']) return 'minced garlic'
    if (dict['garlic']) return 'garlic'
  }
  if (lower.includes('fresh garlic')) {
    if (dict['fresh garlic']) return 'fresh garlic'
    if (dict['garlic']) return 'garlic'
  }
  
  // Handle pepper variations
  if (lower.includes('bell pepper') || lower.includes('sweet pepper')) {
    if (dict['bell pepper']) return 'bell pepper'
  }
  if (lower.includes('red bell pepper') || lower === 'red pepper') {
    if (dict['red bell pepper']) return 'red bell pepper'
    if (dict['bell pepper']) return 'bell pepper'
  }
  if (lower.includes('green bell pepper') || lower === 'green pepper') {
    if (dict['green bell pepper']) return 'green bell pepper'
    if (dict['bell pepper']) return 'bell pepper'
  }
  
  // Handle onion variations
  if (lower.includes('yellow onion') || lower.includes('spanish onion')) {
    if (dict['yellow onion']) return 'yellow onion'
    if (dict['onion']) return 'onion'
  }
  if (lower.includes('red onion') || lower.includes('purple onion')) {
    if (dict['red onion']) return 'red onion'
    if (dict['onion']) return 'onion'
  }
  if (lower.includes('white onion')) {
    if (dict['white onion']) return 'white onion'
    if (dict['onion']) return 'onion'
  }
  
  // Handle tomato variations
  if (lower.includes('roma tomato') || lower.includes('plum tomato')) {
    if (dict['roma tomato']) return 'roma tomato'
    if (dict['tomato']) return 'tomato'
  }
  if (lower.includes('cherry tomato') || lower.includes('grape tomato')) {
    if (dict['cherry tomatoes']) return 'cherry tomatoes'
    if (dict['tomato']) return 'tomato'
  }
  if (lower.includes('heirloom tomato')) {
    if (dict['heirloom tomatoes']) return 'heirloom tomatoes'
    if (dict['tomato']) return 'tomato'
  }
  
  // Handle cheese variations
  if (lower.includes('parmesan') || lower.includes('parmigiano')) {
    if (dict['parmesan cheese']) return 'parmesan cheese'
    if (dict['cheese']) return 'cheese'
  }
  if (lower.includes('mozzarella')) {
    if (dict['mozzarella cheese']) return 'mozzarella cheese'
    if (dict['cheese']) return 'cheese'
  }
  if (lower.includes('cheddar')) {
    if (dict['cheddar cheese']) return 'cheddar cheese'
    if (dict['cheese']) return 'cheese'
  }
  
  // Handle herb variations
  if (lower.includes('fresh basil') || lower === 'basil leaves') {
    if (dict['fresh basil']) return 'fresh basil'
    if (dict['basil']) return 'basil'
  }
  if (lower.includes('fresh parsley') || lower === 'parsley leaves') {
    if (dict['fresh parsley']) return 'fresh parsley'
    if (dict['parsley']) return 'parsley'
  }
  if (lower.includes('fresh cilantro') || lower === 'cilantro leaves') {
    if (dict['fresh cilantro']) return 'fresh cilantro'
    if (dict['cilantro']) return 'cilantro'
  }
  
  // Handle oil variations
  if (lower.includes('extra virgin olive oil') || lower.includes('evoo')) {
    if (dict['olive oil extra virgin']) return 'olive oil extra virgin'
    if (dict['olive oil']) return 'olive oil'
  }
  if (lower.includes('olive oil')) {
    if (dict['olive oil']) return 'olive oil'
  }
  if (lower.includes('vegetable oil') || lower.includes('canola oil')) {
    if (dict['vegetable oil']) return 'vegetable oil'
    if (dict['oil']) return 'oil'
  }
  
  // Handle protein variations
  if (lower.includes('chicken breast') || lower.includes('boneless chicken')) {
    if (dict['chicken breast']) return 'chicken breast'
    if (dict['chicken']) return 'chicken'
  }
  if (lower.includes('ground beef') || lower.includes('hamburger')) {
    if (dict['ground beef']) return 'ground beef'
    if (dict['beef']) return 'beef'
  }
  if (lower.includes('ground turkey')) {
    if (dict['ground turkey']) return 'ground turkey'
    if (dict['turkey']) return 'turkey'
  }
  
  // Handle rice variations
  if (lower.includes('white rice') || lower.includes('long grain rice')) {
    if (dict['white rice']) return 'white rice'
    if (dict['rice']) return 'rice'
  }
  if (lower.includes('brown rice')) {
    if (dict['brown rice']) return 'brown rice'
    if (dict['rice']) return 'rice'
  }
  if (lower.includes('basmati rice')) {
    if (dict['basmati rice']) return 'basmati rice'
    if (dict['rice']) return 'rice'
  }
  
  // Handle milk variations
  if (lower.includes('whole milk') || lower.includes('2% milk') || lower.includes('skim milk')) {
    if (dict[lower]) return lower
    if (dict['milk']) return 'milk'
  }
  
  // Try longest match first (more specific ingredients)
  const sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length)
  
  // Then try to find if any key is contained in the name
  const found = sortedKeys.find(k => lower.includes(k))
  if (found) return found
  
  // Try to find if the name contains any key (partial match)
  const partialMatch = sortedKeys.find(k => {
    const words = lower.split(/\s+/)
    const keyWords = k.split(/\s+/)
    return keyWords.some(keyWord => words.includes(keyWord))
  })
  
  return partialMatch
}

// Location-based pricing multipliers (based on cost of living indices)
const LOCATION_MULTIPLIERS: Record<string, number> = {
  // High-cost US cities
  'san francisco': 1.8,
  'new york city': 1.6,
  'manhattan': 1.7,
  'brooklyn': 1.4,
  'los angeles': 1.4,
  'seattle': 1.5,
  'boston': 1.4,
  'washington dc': 1.3,
  'miami': 1.3,
  'chicago': 1.2,
  'oakland': 1.6,
  'san jose': 1.7,
  'honolulu': 1.9,
  'anchorage': 1.6,
  
  // Medium-cost US cities
  'denver': 1.1,
  'austin': 1.1,
  'portland': 1.2,
  'atlanta': 1.0,
  'philadelphia': 1.1,
  'phoenix': 0.9,
  'dallas': 0.9,
  'houston': 0.9,
  'san antonio': 0.8,
  'nashville': 1.0,
  'charlotte': 0.9,
  'raleigh': 0.9,
  'minneapolis': 1.0,
  'milwaukee': 0.9,
  'cleveland': 0.8,
  'detroit': 0.8,
  'kansas city': 0.8,
  'st louis': 0.8,
  'cincinnati': 0.8,
  'columbus': 0.9,
  'indianapolis': 0.8,
  'jacksonville': 0.9,
  'tampa': 0.9,
  'orlando': 0.9,
  
  // Low-cost US cities
  'birmingham': 0.7,
  'memphis': 0.7,
  'louisville': 0.7,
  'tulsa': 0.7,
  'oklahoma city': 0.7,
  'little rock': 0.6,
  'jackson': 0.6,
  'shreveport': 0.6,
  'mobile': 0.6,
  'huntsville': 0.7,
  'chattanooga': 0.7,
  'knoxville': 0.7,
  'lexington': 0.7,
  'wichita': 0.7,
  'omaha': 0.8,
  'des moines': 0.8,
  'sioux falls': 0.8,
  'fargo': 0.8,
  'grand forks': 0.7,
  'bismarck': 0.8,
  
  // US states (general multipliers)
  'california': 1.3,
  'new york state': 1.2,
  'hawaii': 1.8,
  'alaska': 1.5,
  'massachusetts': 1.2,
  'washington': 1.2,
  'maryland': 1.1,
  'connecticut': 1.1,
  'new jersey': 1.1,
  'oregon': 1.1,
  'colorado': 1.0,
  'virginia': 1.0,
  'florida': 1.0,
  'texas': 0.9,
  'illinois': 1.0,
  'pennsylvania': 1.0,
  'ohio': 0.9,
  'georgia': 0.9,
  'north carolina': 0.9,
  'michigan': 0.9,
  'tennessee': 0.8,
  'indiana': 0.8,
  'missouri': 0.8,
  'wisconsin': 0.9,
  'minnesota': 1.0,
  'arizona': 0.9,
  'louisiana': 0.8,
  'kentucky': 0.8,
  'oklahoma': 0.8,
  'iowa': 0.8,
  'utah': 0.9,
  'nevada': 1.0,
  'new mexico': 0.8,
  'west virginia': 0.7,
  'nebraska': 0.8,
  'idaho': 0.9,
  'maine': 1.0,
  'new hampshire': 1.0,
  'rhode island': 1.1,
  'vermont': 1.1,
  'delaware': 1.0,
  'montana': 0.9,
  'wyoming': 0.9,
  'south dakota': 0.8,
  'north dakota': 0.9,
  'alabama': 0.7,
  'mississippi': 0.7,
  'arkansas': 0.7,
  'kansas': 0.8,
  'south carolina': 0.8,
  
  // International (major cities)
  'london': 1.5,
  'paris': 1.3,
  'tokyo': 1.4,
  'sydney': 1.3,
  'toronto': 1.1,
  'vancouver': 1.2,
  'zurich': 1.8,
  'geneva': 1.7,
  'oslo': 1.6,
  'stockholm': 1.3,
  'copenhagen': 1.4,
  'amsterdam': 1.2,
  'dublin': 1.2,
  'singapore': 1.3,
  'hong kong': 1.4,
  'dubai': 1.1,
  'mumbai': 0.4,
  'delhi': 0.4,
  'bangalore': 0.4,
  'mexico city': 0.5,
  'sao paulo': 0.6,
  'buenos aires': 0.5,
  'cape town': 0.4,
  'johannesburg': 0.4,
  'cairo': 0.3,
  'istanbul': 0.4,
  'moscow': 0.7,
  'beijing': 0.5,
  'shanghai': 0.6,
  'seoul': 0.8,
  'bangkok': 0.4,
  'kuala lumpur': 0.4,
  'manila': 0.3,
  'jakarta': 0.3,
  
  // Default fallbacks
  'usa': 1.0,
  'united states': 1.0,
  'canada': 1.0,
  'uk': 1.2,
  'united kingdom': 1.2,
  'australia': 1.1,
  'germany': 1.1,
  'france': 1.2,
  'italy': 1.0,
  'spain': 0.9,
  'netherlands': 1.2,
  'belgium': 1.1,
  'switzerland': 1.7,
  'austria': 1.1,
  'sweden': 1.3,
  'norway': 1.5,
  'denmark': 1.4,
  'finland': 1.2,
  'japan': 1.2,
  'south korea': 0.9,
  'india': 0.4,
  'china': 0.5,
  'mexico': 0.5,
  'brazil': 0.6,
  'argentina': 0.5,
  'chile': 0.7,
  'south africa': 0.4,
  'thailand': 0.4,
  'malaysia': 0.4,
  'philippines': 0.3,
  'indonesia': 0.3,
  'vietnam': 0.3,
  'turkey': 0.4,
  'egypt': 0.3,
  'russia': 0.7,
  'default': 1.0
}

function getLocationMultiplier(location: string): number {
  if (!location || location.toLowerCase() === 'default') return 1.0
  
  const lower = location.toLowerCase().trim()
  
  // Try exact match first
  const exactMatch = LOCATION_MULTIPLIERS[lower]
  if (exactMatch !== undefined) {
    return exactMatch
  }
  
  // Try to extract city from "City, State" or "City, Country" format
  const parts = lower.split(',').map(part => part.trim())
  if (parts.length >= 2) {
    const city = parts[0]
    const stateOrCountry = parts[1]
    
    // Try city first
    const cityMatch = LOCATION_MULTIPLIERS[city]
    if (cityMatch !== undefined) {
      return cityMatch
    }
    
    // Then try state/country
    const stateMatch = LOCATION_MULTIPLIERS[stateOrCountry]
    if (stateMatch !== undefined) {
      return stateMatch
    }
  }
  
  // Extract ZIP code and map to general US regions
  const zipMatch = location.match(/\b(\d{5})\b/)
  if (zipMatch && zipMatch[1]) {
    const zip = parseInt(zipMatch[1])
    
    // High-cost ZIP ranges (simplified)
    if ((zip >= 90000 && zip <= 96199) || // California
        (zip >= 10000 && zip <= 14999) || // New York
        (zip >= 94000 && zip <= 95199) || // SF Bay Area
        (zip >= 98000 && zip <= 99499) || // Washington
        (zip >= 96700 && zip <= 96999)) { // Hawaii
      return 1.4
    }
    
    // Medium-cost regions
    if ((zip >= 80000 && zip <= 81999) || // Colorado
        (zip >= 78000 && zip <= 79999) || // Texas (Austin area)
        (zip >= 97000 && zip <= 97999) || // Oregon
        (zip >= 30000 && zip <= 31999) || // Georgia (Atlanta area)
        (zip >= 19000 && zip <= 19999)) { // Pennsylvania (Philly area)
      return 1.1
    }
    
    // Low-cost regions
    if ((zip >= 35000 && zip <= 36999) || // Alabama
        (zip >= 38000 && zip <= 39999) || // Mississippi
        (zip >= 72000 && zip <= 72999) || // Arkansas
        (zip >= 73000 && zip <= 74999)) { // Oklahoma
      return 0.8
    }
  }
  
  // Try partial matching for longer location strings
  const locationWords = lower.split(/[\s,]+/)
  for (const word of locationWords) {
    const wordMatch = LOCATION_MULTIPLIERS[word]
    if (wordMatch !== undefined) {
      return wordMatch
    }
  }
  
  // Default multiplier
  return LOCATION_MULTIPLIERS.default || 1.0
}

function toMl(amount: number, unit: string): number | null {
  const u = unit.toLowerCase()
  if (u === 'l' || u === 'liter' || u === 'liters') return amount * 1000
  if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return amount
  if (u === 'cup' || u === 'cups') return amount * 240
  if (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') return amount * 15
  if (u === 'tsp' || u === 'teaspoon' || u === 'teaspoons') return amount * 5
  return null
}

function toGrams(ing: Ingredient): number | null {
  if (typeof ing.weightGrams === 'number' && ing.weightGrams > 0) return ing.weightGrams
  const key = matchKey(ing.name, { ...GRAMS_PER_CUP, ...GRAMS_PER_EACH })
  if (!key) {
    // try liquid ml → g
    const ml = toMl(ing.amount, ing.unit)
    if (ml != null) return ml // assume ~1 g/ml
    return null
  }
  if (/cups?/i.test(ing.unit) && GRAMS_PER_CUP[key] != null) return ing.amount * GRAMS_PER_CUP[key]
  if (!ing.unit || /^(each|small|medium|large|clove|cloves|sprig|sprigs)$/i.test(ing.unit)) {
    const gramsEach = GRAMS_PER_EACH[key]
    if (gramsEach != null) return Math.max(1, Math.round(ing.amount)) * gramsEach
  }
  // Last resort: treat as 1 g/ml conversions or 1 cup ≈ 240 ml
  const ml = toMl(ing.amount, ing.unit)
  if (ml != null) return ml
  return null
}

export function estimateIngredientCost(ing: Ingredient, location: string = 'default'): number {
  const grams = toGrams(ing)
  const keyKg = grams != null ? matchKey(ing.name, PRICE_MAP.perKg || {}) : undefined
  const keyEach = (!ing.unit || /^(each|small|medium|large|clove|cloves)$/i.test(ing.unit)) ? matchKey(ing.name, PRICE_MAP.perEach || {}) : undefined
  const keyLiter = toMl(ing.amount, ing.unit) != null ? matchKey(ing.name, PRICE_MAP.perLiter || {}) : undefined

  let baseCost = 0

  if (grams != null && keyKg && PRICE_MAP.perKg) {
    baseCost = (grams / 1000) * (PRICE_MAP.perKg[keyKg] || 0)
  } else if (keyLiter && PRICE_MAP.perLiter) {
    const ml = toMl(ing.amount, ing.unit) || 0
    baseCost = (ml / 1000) * (PRICE_MAP.perLiter[keyLiter] || 0)
  } else if (keyEach && PRICE_MAP.perEach) {
    const count = !ing.unit || /^(each|small|medium|large|clove|cloves)$/i.test(ing.unit) ? Math.max(1, Math.round(ing.amount)) : ing.amount
    baseCost = (PRICE_MAP.perEach[keyEach] || 0) * count
  } else {
    // Fallback: realistic produce rate $8/kg (doubled for realistic grocery prices)
    if (grams != null) {
      baseCost = (grams / 1000) * 8.0
    } else {
      // Final fallback based on common amounts - realistic grocery prices
      if (ing.amount <= 1) baseCost = ing.amount * 2.5 // Single items like 1 onion = $2.50
      else if (ing.amount <= 3) baseCost = ing.amount * 1.8 // Small quantities like 3 eggs = $5.40
      else if (ing.amount <= 10) baseCost = ing.amount * 1.2 // Medium quantities  
      else baseCost = ing.amount * 0.8 // Large quantities with bulk discount
    }
  }

  // Apply location-based pricing multiplier
  const locationMultiplier = getLocationMultiplier(location)
  return baseCost * locationMultiplier
}

export function estimateRecipeCost(ingredients: Ingredient[], servings: number, location: string = 'default'): { totalCost: number; costPerServing: number } {
  const total = ingredients.reduce((sum, ing) => sum + estimateIngredientCost(ing, location), 0)
  const per = servings > 0 ? total / servings : total
  return { totalCost: round2(total), costPerServing: round2(per) }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }


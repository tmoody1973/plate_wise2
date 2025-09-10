/**
 * Intelligent Ingredient Classification System
 * Determines whether ingredients are available at regular stores vs. ethnic specialty stores
 */

export interface IngredientClassification {
  ingredient: string;
  availability: 'regular' | 'specialty' | 'both';
  confidence: 'high' | 'medium' | 'low';
  preferredStoreType: string[];
  culturalOrigin?: string;
  commonAlternatives?: string[];
  notes?: string;
}

export interface StoreRecommendation {
  storeType: 'regular' | 'ethnic' | 'specialty';
  culturalFocus?: string; // 'asian', 'mexican', 'middle-eastern', etc.
  searchTerms: string[];
  priority: number; // 1 = highest priority
}

class IngredientClassifierService {

  /**
   * Comprehensive ingredient classification database
   */
  private ingredientDatabase = new Map<string, IngredientClassification>([
    // ASIAN INGREDIENTS
    // Common - Available at regular stores
    ['soy sauce', { ingredient: 'soy sauce', availability: 'both', confidence: 'high', preferredStoreType: ['regular', 'asian'], culturalOrigin: 'asian' }],
    ['sesame oil', { ingredient: 'sesame oil', availability: 'both', confidence: 'high', preferredStoreType: ['regular', 'asian'], culturalOrigin: 'asian' }],
    ['rice vinegar', { ingredient: 'rice vinegar', availability: 'both', confidence: 'high', preferredStoreType: ['regular', 'asian'], culturalOrigin: 'asian' }],
    ['sriracha', { ingredient: 'sriracha', availability: 'both', confidence: 'high', preferredStoreType: ['regular', 'asian'], culturalOrigin: 'asian' }],
    ['ginger', { ingredient: 'ginger', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'], culturalOrigin: 'asian' }],
    ['garlic', { ingredient: 'garlic', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['green onions', { ingredient: 'green onions', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['scallions', { ingredient: 'scallions', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],

    // Specialty - Require ethnic stores
    ['dark soy sauce', { ingredient: 'dark soy sauce', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian'], culturalOrigin: 'asian', commonAlternatives: ['soy sauce + molasses'] }],
    ['light soy sauce', { ingredient: 'light soy sauce', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian'], culturalOrigin: 'asian', commonAlternatives: ['regular soy sauce'] }],
    ['korean radish', { ingredient: 'korean radish', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'korean'], culturalOrigin: 'korean', commonAlternatives: ['daikon radish'] }],
    ['daikon radish', { ingredient: 'daikon radish', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian'], culturalOrigin: 'asian', commonAlternatives: ['regular radish'] }],
    ['miso paste', { ingredient: 'miso paste', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'japanese'], culturalOrigin: 'japanese' }],
    ['mirin', { ingredient: 'mirin', availability: 'specialty', confidence: 'medium', preferredStoreType: ['asian', 'japanese'], culturalOrigin: 'japanese', commonAlternatives: ['rice wine + sugar'] }],
    ['sake', { ingredient: 'sake', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'japanese', 'liquor'], culturalOrigin: 'japanese' }],
    ['nori sheets', { ingredient: 'nori sheets', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'japanese'], culturalOrigin: 'japanese' }],
    ['wasabi', { ingredient: 'wasabi', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'japanese'], culturalOrigin: 'japanese' }],
    ['kimchi', { ingredient: 'kimchi', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'korean'], culturalOrigin: 'korean' }],
    ['gochujang', { ingredient: 'gochujang', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'korean'], culturalOrigin: 'korean' }],
    ['fish sauce', { ingredient: 'fish sauce', availability: 'specialty', confidence: 'medium', preferredStoreType: ['asian', 'vietnamese', 'thai'], culturalOrigin: 'southeast asian' }],
    ['coconut milk', { ingredient: 'coconut milk', availability: 'both', confidence: 'high', preferredStoreType: ['regular', 'asian'], culturalOrigin: 'asian' }],
    ['lemongrass', { ingredient: 'lemongrass', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'thai'], culturalOrigin: 'southeast asian' }],
    ['galangal', { ingredient: 'galangal', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'thai'], culturalOrigin: 'southeast asian', commonAlternatives: ['ginger'] }],
    ['kaffir lime leaves', { ingredient: 'kaffir lime leaves', availability: 'specialty', confidence: 'high', preferredStoreType: ['asian', 'thai'], culturalOrigin: 'thai' }],

    // MEXICAN INGREDIENTS
    // Common - Available at regular stores
    ['cumin', { ingredient: 'cumin', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['chili powder', { ingredient: 'chili powder', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['paprika', { ingredient: 'paprika', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['cilantro', { ingredient: 'cilantro', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['lime', { ingredient: 'lime', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['jalapeño', { ingredient: 'jalapeño', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['jalapeño peppers', { ingredient: 'jalapeño peppers', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['avocado', { ingredient: 'avocado', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['onion', { ingredient: 'onion', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['garlic', { ingredient: 'garlic', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['tomato', { ingredient: 'tomato', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],

    // Specialty - Require Mexican stores
    ['masa harina', { ingredient: 'masa harina', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['corn flour'] }],
    ['mexican crema', { ingredient: 'mexican crema', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['sour cream'] }],
    ['crema mexicana', { ingredient: 'crema mexicana', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['sour cream'] }],
    ['queso fresco', { ingredient: 'queso fresco', availability: 'specialty', confidence: 'medium', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['ricotta cheese'] }],
    ['queso oaxaca', { ingredient: 'queso oaxaca', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['mozzarella cheese'] }],
    ['cotija cheese', { ingredient: 'cotija cheese', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['parmesan cheese'] }],
    ['queso blanco', { ingredient: 'queso blanco', availability: 'specialty', confidence: 'medium', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['monterey jack'] }],
    ['epazote', { ingredient: 'epazote', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican' }],
    ['mexican oregano', { ingredient: 'mexican oregano', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['regular oregano'] }],
    ['hoja santa', { ingredient: 'hoja santa', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican' }],
    ['mexican mint marigold', { ingredient: 'mexican mint marigold', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['tarragon'] }],

    // Mexican Peppers - Specialty
    ['poblano peppers', { ingredient: 'poblano peppers', availability: 'specialty', confidence: 'medium', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['bell peppers'] }],
    ['poblano', { ingredient: 'poblano', availability: 'specialty', confidence: 'medium', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['bell peppers'] }],
    ['ancho peppers', { ingredient: 'ancho peppers', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['dried poblano'] }],
    ['guajillo peppers', { ingredient: 'guajillo peppers', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican' }],
    ['chipotle peppers', { ingredient: 'chipotle peppers', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'mexican'], culturalOrigin: 'mexican' }],
    ['chipotle in adobo', { ingredient: 'chipotle in adobo', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'mexican'], culturalOrigin: 'mexican' }],
    ['serrano peppers', { ingredient: 'serrano peppers', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'mexican'], culturalOrigin: 'mexican' }],
    ['habanero peppers', { ingredient: 'habanero peppers', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['pasilla peppers', { ingredient: 'pasilla peppers', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican' }],
    ['mulato peppers', { ingredient: 'mulato peppers', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican' }],

    // Mexican Vegetables & Fruits
    ['tomatillos', { ingredient: 'tomatillos', availability: 'specialty', confidence: 'medium', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['green tomatoes'] }],
    ['nopales', { ingredient: 'nopales', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', notes: 'Prickly pear cactus pads' }],
    ['cactus pads', { ingredient: 'cactus pads', availability: 'specialty', confidence: 'high', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican' }],
    ['jicama', { ingredient: 'jicama', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'mexican'], culturalOrigin: 'mexican' }],
    ['chayote', { ingredient: 'chayote', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'mexican', 'caribbean'], culturalOrigin: 'mexican' }],
    ['mexican squash', { ingredient: 'mexican squash', availability: 'specialty', confidence: 'medium', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['zucchini'] }],
    ['calabacitas', { ingredient: 'calabacitas', availability: 'specialty', confidence: 'medium', preferredStoreType: ['mexican', 'latin'], culturalOrigin: 'mexican', commonAlternatives: ['zucchini'] }],

    // SOUTH AMERICAN INGREDIENTS
    // Peruvian
    ['aji amarillo', { ingredient: 'aji amarillo', availability: 'specialty', confidence: 'high', preferredStoreType: ['peruvian', 'south-american'], culturalOrigin: 'peruvian' }],
    ['aji panca', { ingredient: 'aji panca', availability: 'specialty', confidence: 'high', preferredStoreType: ['peruvian', 'south-american'], culturalOrigin: 'peruvian' }],
    ['purple corn', { ingredient: 'purple corn', availability: 'specialty', confidence: 'high', preferredStoreType: ['peruvian', 'south-american'], culturalOrigin: 'peruvian' }],
    ['quinoa', { ingredient: 'quinoa', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'], culturalOrigin: 'peruvian' }],
    ['lucuma', { ingredient: 'lucuma', availability: 'specialty', confidence: 'high', preferredStoreType: ['peruvian', 'south-american'], culturalOrigin: 'peruvian' }],
    ['huacatay', { ingredient: 'huacatay', availability: 'specialty', confidence: 'high', preferredStoreType: ['peruvian', 'south-american'], culturalOrigin: 'peruvian', commonAlternatives: ['mint + cilantro'] }],
    ['culantro', { ingredient: 'culantro', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean', 'south-american'], culturalOrigin: 'south american', commonAlternatives: ['cilantro'] }],

    // Argentinian
    ['chimichurri', { ingredient: 'chimichurri', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'south-american'], culturalOrigin: 'argentinian' }],
    ['dulce de leche', { ingredient: 'dulce de leche', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'south-american'], culturalOrigin: 'argentinian' }],
    ['yerba mate', { ingredient: 'yerba mate', availability: 'specialty', confidence: 'high', preferredStoreType: ['south-american', 'health'], culturalOrigin: 'argentinian' }],

    // Brazilian
    ['cachaça', { ingredient: 'cachaça', availability: 'specialty', confidence: 'high', preferredStoreType: ['brazilian', 'liquor'], culturalOrigin: 'brazilian' }],
    ['dendê oil', { ingredient: 'dendê oil', availability: 'specialty', confidence: 'high', preferredStoreType: ['brazilian', 'south-american'], culturalOrigin: 'brazilian', commonAlternatives: ['palm oil'] }],
    ['farofa', { ingredient: 'farofa', availability: 'specialty', confidence: 'high', preferredStoreType: ['brazilian', 'south-american'], culturalOrigin: 'brazilian' }],
    ['cassava flour', { ingredient: 'cassava flour', availability: 'specialty', confidence: 'high', preferredStoreType: ['brazilian', 'south-american', 'african'], culturalOrigin: 'brazilian' }],
    ['tapioca flour', { ingredient: 'tapioca flour', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'south-american'], culturalOrigin: 'brazilian' }],
    ['açaí', { ingredient: 'açaí', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'health', 'brazilian'], culturalOrigin: 'brazilian' }],
    ['guaraná', { ingredient: 'guaraná', availability: 'specialty', confidence: 'high', preferredStoreType: ['brazilian', 'south-american'], culturalOrigin: 'brazilian' }],

    // Colombian/Venezuelan
    ['arepas flour', { ingredient: 'arepas flour', availability: 'specialty', confidence: 'high', preferredStoreType: ['colombian', 'venezuelan', 'south-american'], culturalOrigin: 'colombian' }],
    ['masarepa', { ingredient: 'masarepa', availability: 'specialty', confidence: 'high', preferredStoreType: ['colombian', 'venezuelan', 'south-american'], culturalOrigin: 'colombian' }],
    ['panela', { ingredient: 'panela', availability: 'specialty', confidence: 'high', preferredStoreType: ['colombian', 'south-american'], culturalOrigin: 'colombian', commonAlternatives: ['brown sugar'] }],
    ['guava paste', { ingredient: 'guava paste', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'south-american'], culturalOrigin: 'south american' }],

    // Chilean
    ['merkén', { ingredient: 'merkén', availability: 'specialty', confidence: 'high', preferredStoreType: ['chilean', 'south-american'], culturalOrigin: 'chilean' }],
    ['pisco', { ingredient: 'pisco', availability: 'specialty', confidence: 'high', preferredStoreType: ['chilean', 'peruvian', 'liquor'], culturalOrigin: 'chilean' }],

    // MIDDLE EASTERN INGREDIENTS
    // Common - Available at regular stores
    ['olive oil', { ingredient: 'olive oil', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['lemon', { ingredient: 'lemon', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['parsley', { ingredient: 'parsley', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['mint', { ingredient: 'mint', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],

    // Specialty - Require ethnic stores
    ['tahini', { ingredient: 'tahini', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'middle-eastern'], culturalOrigin: 'middle eastern' }],
    ['sumac', { ingredient: 'sumac', availability: 'specialty', confidence: 'high', preferredStoreType: ['middle-eastern'], culturalOrigin: 'middle eastern' }],
    ['za\'atar', { ingredient: 'za\'atar', availability: 'specialty', confidence: 'high', preferredStoreType: ['middle-eastern'], culturalOrigin: 'middle eastern' }],
    ['pomegranate molasses', { ingredient: 'pomegranate molasses', availability: 'specialty', confidence: 'high', preferredStoreType: ['middle-eastern'], culturalOrigin: 'middle eastern' }],
    ['rose water', { ingredient: 'rose water', availability: 'specialty', confidence: 'high', preferredStoreType: ['middle-eastern', 'indian'], culturalOrigin: 'middle eastern' }],
    ['orange blossom water', { ingredient: 'orange blossom water', availability: 'specialty', confidence: 'high', preferredStoreType: ['middle-eastern'], culturalOrigin: 'middle eastern' }],
    ['bulgur wheat', { ingredient: 'bulgur wheat', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'middle-eastern'], culturalOrigin: 'middle eastern' }],
    ['freekeh', { ingredient: 'freekeh', availability: 'specialty', confidence: 'high', preferredStoreType: ['middle-eastern'], culturalOrigin: 'middle eastern' }],

    // INDIAN INGREDIENTS
    // Common - Available at regular stores
    ['turmeric', { ingredient: 'turmeric', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['curry powder', { ingredient: 'curry powder', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'] }],
    ['garam masala', { ingredient: 'garam masala', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'indian'], culturalOrigin: 'indian' }],

    // Specialty - Require ethnic stores
    ['asafoetida', { ingredient: 'asafoetida', availability: 'specialty', confidence: 'high', preferredStoreType: ['indian'], culturalOrigin: 'indian' }],
    ['fenugreek leaves', { ingredient: 'fenugreek leaves', availability: 'specialty', confidence: 'high', preferredStoreType: ['indian'], culturalOrigin: 'indian' }],
    ['curry leaves', { ingredient: 'curry leaves', availability: 'specialty', confidence: 'high', preferredStoreType: ['indian'], culturalOrigin: 'indian' }],
    ['tamarind paste', { ingredient: 'tamarind paste', availability: 'specialty', confidence: 'high', preferredStoreType: ['indian', 'asian'], culturalOrigin: 'indian' }],
    ['jaggery', { ingredient: 'jaggery', availability: 'specialty', confidence: 'high', preferredStoreType: ['indian'], culturalOrigin: 'indian', commonAlternatives: ['brown sugar'] }],
    ['ghee', { ingredient: 'ghee', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'indian'], culturalOrigin: 'indian', commonAlternatives: ['clarified butter'] }],

    // AFRICAN INGREDIENTS
    // Ethiopian
    ['berbere spice', { ingredient: 'berbere spice', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'ethiopian'], culturalOrigin: 'ethiopian' }],
    ['injera', { ingredient: 'injera', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'ethiopian'], culturalOrigin: 'ethiopian' }],
    ['mitmita', { ingredient: 'mitmita', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'ethiopian'], culturalOrigin: 'ethiopian' }],
    ['teff flour', { ingredient: 'teff flour', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'ethiopian'], culturalOrigin: 'ethiopian', commonAlternatives: ['whole wheat flour'] }],

    // West African
    ['palm oil', { ingredient: 'palm oil', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'west-african'], culturalOrigin: 'west african', commonAlternatives: ['vegetable oil'] }],
    ['scotch bonnet peppers', { ingredient: 'scotch bonnet peppers', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean', 'african'], culturalOrigin: 'caribbean', commonAlternatives: ['habanero peppers'] }],
    ['scotch bonnet', { ingredient: 'scotch bonnet', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean', 'african'], culturalOrigin: 'caribbean', commonAlternatives: ['habanero peppers'] }],
    ['plantain', { ingredient: 'plantain', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'caribbean', 'african'], culturalOrigin: 'caribbean' }],
    ['yuca', { ingredient: 'yuca', availability: 'specialty', confidence: 'medium', preferredStoreType: ['caribbean', 'african', 'latin'], culturalOrigin: 'caribbean', commonAlternatives: ['potato'] }],
    ['cassava', { ingredient: 'cassava', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'caribbean'], culturalOrigin: 'african', commonAlternatives: ['potato'] }],
    ['fufu flour', { ingredient: 'fufu flour', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'west-african'], culturalOrigin: 'west african' }],
    ['egusi seeds', { ingredient: 'egusi seeds', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'west-african'], culturalOrigin: 'west african' }],
    ['okra', { ingredient: 'okra', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'african', 'southern'], culturalOrigin: 'african' }],
    ['bitter leaf', { ingredient: 'bitter leaf', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'west-african'], culturalOrigin: 'west african' }],
    ['uziza leaves', { ingredient: 'uziza leaves', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'west-african'], culturalOrigin: 'west african' }],
    ['locust beans', { ingredient: 'locust beans', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'west-african'], culturalOrigin: 'west african' }],
    ['dawadawa', { ingredient: 'dawadawa', availability: 'specialty', confidence: 'high', preferredStoreType: ['african', 'west-african'], culturalOrigin: 'west african' }],

    // North African
    ['harissa', { ingredient: 'harissa', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'middle-eastern', 'african'], culturalOrigin: 'north african' }],
    ['ras el hanout', { ingredient: 'ras el hanout', availability: 'specialty', confidence: 'high', preferredStoreType: ['middle-eastern', 'african'], culturalOrigin: 'north african' }],
    ['preserved lemons', { ingredient: 'preserved lemons', availability: 'specialty', confidence: 'high', preferredStoreType: ['middle-eastern', 'african'], culturalOrigin: 'north african', commonAlternatives: ['lemon zest + salt'] }],

    // CARIBBEAN INGREDIENTS
    // Jamaican
    ['jerk seasoning', { ingredient: 'jerk seasoning', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'caribbean'], culturalOrigin: 'jamaican' }],
    ['allspice berries', { ingredient: 'allspice berries', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean', 'spice'], culturalOrigin: 'jamaican', commonAlternatives: ['ground allspice'] }],
    ['pimento berries', { ingredient: 'pimento berries', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'jamaican', commonAlternatives: ['allspice berries'] }],
    ['ackee', { ingredient: 'ackee', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'jamaican' }],
    ['callaloo', { ingredient: 'callaloo', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'caribbean', commonAlternatives: ['spinach', 'collard greens'] }],
    ['breadfruit', { ingredient: 'breadfruit', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'caribbean', commonAlternatives: ['potato'] }],
    ['cho cho', { ingredient: 'cho cho', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'jamaican', commonAlternatives: ['chayote squash'] }],
    ['chayote', { ingredient: 'chayote', availability: 'both', confidence: 'medium', preferredStoreType: ['regular', 'caribbean', 'mexican'], culturalOrigin: 'caribbean' }],

    // Haitian
    ['epis', { ingredient: 'epis', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean', 'haitian'], culturalOrigin: 'haitian' }],
    ['pikliz', { ingredient: 'pikliz', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean', 'haitian'], culturalOrigin: 'haitian' }],
    ['malanga', { ingredient: 'malanga', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean', 'latin'], culturalOrigin: 'caribbean', commonAlternatives: ['taro root'] }],
    ['taro root', { ingredient: 'taro root', availability: 'specialty', confidence: 'medium', preferredStoreType: ['asian', 'caribbean'], culturalOrigin: 'caribbean' }],

    // Trinidad & Tobago
    ['curry powder trinidad', { ingredient: 'curry powder trinidad', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'trinidadian', commonAlternatives: ['curry powder'] }],
    ['chadon beni', { ingredient: 'chadon beni', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'trinidadian', commonAlternatives: ['cilantro'] }],
    ['culantro', { ingredient: 'culantro', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean', 'latin'], culturalOrigin: 'caribbean', commonAlternatives: ['cilantro'] }],
    ['shadow beni', { ingredient: 'shadow beni', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'trinidadian', commonAlternatives: ['cilantro'] }],

    // General Caribbean
    ['coconut cream', { ingredient: 'coconut cream', availability: 'both', confidence: 'high', preferredStoreType: ['regular', 'caribbean', 'asian'], culturalOrigin: 'caribbean' }],
    ['coconut water', { ingredient: 'coconut water', availability: 'regular', confidence: 'high', preferredStoreType: ['regular'], culturalOrigin: 'caribbean' }],
    ['green seasoning', { ingredient: 'green seasoning', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'caribbean' }],
    ['cassareep', { ingredient: 'cassareep', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'guyanese' }],
    ['tamarind paste', { ingredient: 'tamarind paste', availability: 'specialty', confidence: 'high', preferredStoreType: ['indian', 'asian', 'caribbean'], culturalOrigin: 'caribbean' }],
    ['sorrel', { ingredient: 'sorrel', availability: 'specialty', confidence: 'high', preferredStoreType: ['caribbean'], culturalOrigin: 'caribbean', notes: 'Hibiscus flowers for sorrel drink' }],
    ['hibiscus flowers', { ingredient: 'hibiscus flowers', availability: 'specialty', confidence: 'medium', preferredStoreType: ['caribbean', 'middle-eastern', 'health'], culturalOrigin: 'caribbean' }],
  ]);

  /**
   * Store type mapping for Google Places searches
   */
  private storeTypeMapping = new Map<string, StoreRecommendation>([
    ['regular', { storeType: 'regular', searchTerms: ['grocery store', 'supermarket', 'Kroger', 'Safeway', 'Walmart'], priority: 1 }],
    ['asian', { storeType: 'ethnic', culturalFocus: 'asian', searchTerms: ['Asian grocery', 'Asian market', 'Chinese grocery', 'H Mart', 'Asian supermarket'], priority: 2 }],
    ['korean', { storeType: 'ethnic', culturalFocus: 'korean', searchTerms: ['Korean grocery', 'Korean market', 'H Mart', 'Korean supermarket'], priority: 2 }],
    ['japanese', { storeType: 'ethnic', culturalFocus: 'japanese', searchTerms: ['Japanese grocery', 'Japanese market', 'Mitsuwa', 'Japanese supermarket'], priority: 2 }],
    ['thai', { storeType: 'ethnic', culturalFocus: 'thai', searchTerms: ['Thai grocery', 'Thai market', 'Southeast Asian market'], priority: 2 }],
    ['vietnamese', { storeType: 'ethnic', culturalFocus: 'vietnamese', searchTerms: ['Vietnamese grocery', 'Vietnamese market', 'Southeast Asian market'], priority: 2 }],
    ['mexican', { storeType: 'ethnic', culturalFocus: 'mexican', searchTerms: ['Mexican grocery', 'Mexican market', 'Latino market', 'Hispanic grocery'], priority: 2 }],
    ['latin', { storeType: 'ethnic', culturalFocus: 'latin', searchTerms: ['Latino market', 'Hispanic grocery', 'Latin American market'], priority: 2 }],
    ['south-american', { storeType: 'ethnic', culturalFocus: 'south-american', searchTerms: ['South American market', 'Latino market', 'Latin American grocery'], priority: 2 }],
    ['peruvian', { storeType: 'ethnic', culturalFocus: 'peruvian', searchTerms: ['Peruvian market', 'South American grocery', 'Latino market'], priority: 2 }],
    ['brazilian', { storeType: 'ethnic', culturalFocus: 'brazilian', searchTerms: ['Brazilian market', 'South American grocery', 'Brazilian grocery'], priority: 2 }],
    ['argentinian', { storeType: 'ethnic', culturalFocus: 'argentinian', searchTerms: ['Argentinian market', 'South American grocery', 'Latino market'], priority: 2 }],
    ['colombian', { storeType: 'ethnic', culturalFocus: 'colombian', searchTerms: ['Colombian market', 'South American grocery', 'Latino market'], priority: 2 }],
    ['venezuelan', { storeType: 'ethnic', culturalFocus: 'venezuelan', searchTerms: ['Venezuelan market', 'South American grocery', 'Latino market'], priority: 2 }],
    ['chilean', { storeType: 'ethnic', culturalFocus: 'chilean', searchTerms: ['Chilean market', 'South American grocery', 'Latino market'], priority: 2 }],
    ['middle-eastern', { storeType: 'ethnic', culturalFocus: 'middle-eastern', searchTerms: ['Middle Eastern grocery', 'Halal market', 'Mediterranean market'], priority: 2 }],
    ['indian', { storeType: 'ethnic', culturalFocus: 'indian', searchTerms: ['Indian grocery', 'Indian market', 'South Asian market', 'Patel Brothers'], priority: 2 }],
    ['african', { storeType: 'ethnic', culturalFocus: 'african', searchTerms: ['African grocery', 'African market', 'Ethiopian market', 'West African market'], priority: 2 }],
    ['ethiopian', { storeType: 'ethnic', culturalFocus: 'ethiopian', searchTerms: ['Ethiopian grocery', 'Ethiopian market', 'African market'], priority: 2 }],
    ['west-african', { storeType: 'ethnic', culturalFocus: 'west-african', searchTerms: ['West African market', 'Nigerian grocery', 'Ghanaian market', 'African grocery'], priority: 2 }],
    ['caribbean', { storeType: 'ethnic', culturalFocus: 'caribbean', searchTerms: ['Caribbean grocery', 'Caribbean market', 'Jamaican market', 'West Indian market'], priority: 2 }],
    ['jamaican', { storeType: 'ethnic', culturalFocus: 'jamaican', searchTerms: ['Jamaican market', 'Caribbean grocery', 'West Indian market'], priority: 2 }],
    ['haitian', { storeType: 'ethnic', culturalFocus: 'haitian', searchTerms: ['Haitian market', 'Caribbean grocery', 'Haitian grocery'], priority: 2 }],
    ['trinidadian', { storeType: 'ethnic', culturalFocus: 'trinidadian', searchTerms: ['Trinidad market', 'Caribbean grocery', 'West Indian market'], priority: 2 }],
  ]);

  /**
   * Classify an ingredient and determine where it can be found
   */
  classifyIngredient(ingredient: string): IngredientClassification {
    const normalizedIngredient = this.normalizeIngredientName(ingredient);

    // Check exact match first
    const exactMatch = this.ingredientDatabase.get(normalizedIngredient);
    if (exactMatch) {
      return exactMatch;
    }

    // Check partial matches
    const partialMatch = this.findPartialMatch(normalizedIngredient);
    if (partialMatch) {
      return { ...partialMatch, confidence: 'medium' };
    }

    // Use AI-based classification for unknown ingredients
    return this.aiClassifyIngredient(normalizedIngredient);
  }

  /**
   * Get store recommendations for a specific ingredient
   */
  getStoreRecommendations(ingredient: string, userLocation: string): StoreRecommendation[] {
    const classification = this.classifyIngredient(ingredient);
    const recommendations: StoreRecommendation[] = [];

    for (const storeType of classification.preferredStoreType) {
      const storeRec = this.storeTypeMapping.get(storeType);
      if (storeRec) {
        recommendations.push(storeRec);
      }
    }

    // Sort by priority (lower number = higher priority)
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate Google Places search queries for finding stores that carry specific ingredients
   */
  generateStoreSearchQueries(ingredients: string[], userLocation: string): Array<{
    query: string;
    storeType: string;
    culturalFocus?: string;
    ingredients: string[];
  }> {
    const storeGroups = new Map<string, string[]>();

    // Group ingredients by preferred store type
    ingredients.forEach(ingredient => {
      const classification = this.classifyIngredient(ingredient);
      const primaryStoreType = classification.preferredStoreType[0] || 'regular';

      if (!storeGroups.has(primaryStoreType)) {
        storeGroups.set(primaryStoreType, []);
      }
      storeGroups.get(primaryStoreType)!.push(ingredient);
    });

    // Generate search queries for each store type
    const queries: Array<{
      query: string;
      storeType: string;
      culturalFocus?: string;
      ingredients: string[];
    }> = [];

    storeGroups.forEach((ingredientList, storeType) => {
      const storeRec = this.storeTypeMapping.get(storeType);
      if (storeRec) {
        storeRec.searchTerms.forEach(searchTerm => {
          queries.push({
            query: `${searchTerm} near ${userLocation}`,
            storeType: storeRec.storeType,
            culturalFocus: storeRec.culturalFocus,
            ingredients: ingredientList
          });
        });
      }
    });

    return queries;
  }

  /**
   * Determine if an ingredient requires a specialty store
   */
  requiresSpecialtyStore(ingredient: string): boolean {
    const classification = this.classifyIngredient(ingredient);
    return classification.availability === 'specialty';
  }

  /**
   * Get common alternatives for specialty ingredients
   */
  getCommonAlternatives(ingredient: string): string[] {
    const classification = this.classifyIngredient(ingredient);
    return classification.commonAlternatives || [];
  }

  /**
   * Normalize ingredient names for consistent matching
   */
  private normalizeIngredientName(ingredient: string): string {
    return ingredient.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s'-]/g, ''); // Remove special characters except apostrophes and hyphens
  }

  /**
   * Find partial matches in the ingredient database
   */
  private findPartialMatch(ingredient: string): IngredientClassification | null {
    for (const [key, classification] of this.ingredientDatabase) {
      if (ingredient.includes(key) || key.includes(ingredient)) {
        return classification;
      }
    }
    return null;
  }

  /**
   * AI-based classification for unknown ingredients
   */
  private aiClassifyIngredient(ingredient: string): IngredientClassification {
    // Simple heuristic-based classification
    const asianKeywords = ['sauce', 'paste', 'noodle', 'rice', 'miso', 'sake', 'mirin', 'dashi'];
    const mexicanKeywords = ['pepper', 'chile', 'masa', 'queso', 'crema', 'salsa', 'poblano', 'chipotle', 'tomatillo', 'epazote', 'nopales'];
    const southAmericanKeywords = ['aji', 'quinoa', 'lucuma', 'chimichurri', 'dulce de leche', 'cachaça', 'farofa', 'arepa', 'panela', 'merkén'];
    const middleEasternKeywords = ['tahini', 'sumac', 'za\'atar', 'bulgur', 'freekeh'];
    const indianKeywords = ['masala', 'curry', 'dal', 'ghee', 'paneer', 'basmati'];
    const caribbeanKeywords = ['scotch bonnet', 'jerk', 'plantain', 'ackee', 'callaloo', 'breadfruit', 'allspice', 'pimento'];
    const africanKeywords = ['berbere', 'injera', 'palm oil', 'cassava', 'fufu', 'egusi', 'dawadawa', 'bitter leaf'];

    if (asianKeywords.some(keyword => ingredient.includes(keyword))) {
      return {
        ingredient,
        availability: 'specialty',
        confidence: 'low',
        preferredStoreType: ['asian', 'regular'],
        culturalOrigin: 'asian',
        notes: 'AI classified as Asian ingredient'
      };
    }

    if (caribbeanKeywords.some(keyword => ingredient.includes(keyword))) {
      return {
        ingredient,
        availability: 'specialty',
        confidence: 'low',
        preferredStoreType: ['caribbean', 'regular'],
        culturalOrigin: 'caribbean',
        notes: 'AI classified as Caribbean ingredient'
      };
    }

    if (africanKeywords.some(keyword => ingredient.includes(keyword))) {
      return {
        ingredient,
        availability: 'specialty',
        confidence: 'low',
        preferredStoreType: ['african', 'regular'],
        culturalOrigin: 'african',
        notes: 'AI classified as African ingredient'
      };
    }

    if (southAmericanKeywords.some(keyword => ingredient.includes(keyword))) {
      return {
        ingredient,
        availability: 'specialty',
        confidence: 'low',
        preferredStoreType: ['south-american', 'regular'],
        culturalOrigin: 'south american',
        notes: 'AI classified as South American ingredient'
      };
    }

    if (mexicanKeywords.some(keyword => ingredient.includes(keyword))) {
      return {
        ingredient,
        availability: 'specialty',
        confidence: 'low',
        preferredStoreType: ['mexican', 'regular'],
        culturalOrigin: 'mexican',
        notes: 'AI classified as Mexican ingredient'
      };
    }

    if (middleEasternKeywords.some(keyword => ingredient.includes(keyword))) {
      return {
        ingredient,
        availability: 'specialty',
        confidence: 'low',
        preferredStoreType: ['middle-eastern', 'regular'],
        culturalOrigin: 'middle eastern',
        notes: 'AI classified as Middle Eastern ingredient'
      };
    }

    if (indianKeywords.some(keyword => ingredient.includes(keyword))) {
      return {
        ingredient,
        availability: 'specialty',
        confidence: 'low',
        preferredStoreType: ['indian', 'regular'],
        culturalOrigin: 'indian',
        notes: 'AI classified as Indian ingredient'
      };
    }

    // Default to regular store availability
    return {
      ingredient,
      availability: 'regular',
      confidence: 'low',
      preferredStoreType: ['regular'],
      notes: 'AI classified as common ingredient'
    };
  }
}

export const ingredientClassifierService = new IngredientClassifierService();
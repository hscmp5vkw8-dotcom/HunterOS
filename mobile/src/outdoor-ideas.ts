import { newGear } from './domain.ts';
import type { Category } from './types.ts';
export const foodIdeas=[
 {id:'trail-mix',name:'Homemade trail mix',recipe:'Mix 1 cup of ready-to-eat roasted nuts or seeds, 1/2 cup of dried fruit and 1/2 cup of pretzels. Divide into portions in clean, dry containers. Swap ingredients to suit your allergies and preferences.'},
 {id:'cereal-crunch',name:'Cinnamon cereal crunch',recipe:'Mix 1 cup of ready-to-eat oat cereal, 1/2 cup of roasted pumpkin seeds and 1/2 cup of raisins. Add a pinch of cinnamon, toss and portion into clean, dry containers. Check cereal and seed labels for allergens.'},
 {id:'breakfast',name:'Instant oats breakfast pouch',recipe:'Pack instant oats, dried fruit and powdered milk separately or in a dry pouch. Follow the oats and milk package preparation directions at camp. Account for the water and fuel needed.'},
 {id:'lunch',name:'Shelf-stable trail lunch',recipe:'Choose sealed, shelf-stable single-serving food such as a fish or bean pouch, crackers and dried fruit. Check package storage directions and ingredients. Eat opened portions promptly.'},
];
export function foodGear(id:string){const idea=foodIdeas.find(i=>i.id===id);if(!idea)throw Error('Food idea not found.');return {...newGear(idea.name,'Food & nutrition','food-idea-'+idea.id,'consumable'),note:idea.recipe+' Weigh your own portion and enter its label calories, quantity and price. This is a food idea, not a nutritional target.'};}
export const offroadEssentials:{name:string;category:Category;query:string;note:string}[]=[
 {name:'First-aid kit',category:'Navigation & safety',query:'first aid',note:'Keep it accessible and learn how to use it.'},
 {name:'Offline navigation and route backup',category:'Navigation & safety',query:'',note:'Download your route and leave a check-in plan.'},
 {name:'Drinking water and a reserve',category:'Water & food',query:'',note:'Plan water for the route, weather and delays.'},
 {name:'Food and trail snacks',category:'Food & nutrition',query:'',note:'Pack portions and a reserve for delays.'},
 {name:'Recovery equipment',category:'Recovery & towing',query:'',note:'Match ratings and attachment points to the vehicle; follow manufacturer instructions.'},
 {name:'Tire repair, gauge and inflator',category:'Tools & tires',query:'',note:'Check compatibility with your tires.'},
 {name:'Vehicle tools and essential spares',category:'Tools & tires',query:'',note:'Use the vehicle maintenance guide to choose your kit.'},
 {name:'Communications and backup lighting',category:'Electronics & power',query:'',note:'Confirm coverage and carry spare power.'},
 {name:'Weather protection and emergency shelter',category:'Shelter & sleep',query:'',note:'Match protection to the forecast and exposure.'},
 {name:'Secured storage and appropriate riding protection',category:'Vehicle storage',query:'',note:'Secure cargo; use protection suited to your vehicle and follow its safety instructions.'},
];

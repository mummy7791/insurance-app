export type CarModel={name:string;segment:"hatch"|"sedan"|"suv"|"premium"};
export type CarBrand={brand:string;models:CarModel[]};
const m=(names:string[],segment:CarModel["segment"])=>names.map(name=>({name,segment}));
export const CAR_CATALOG:CarBrand[]=[
{brand:"Maruti Suzuki",models:[...m(["Alto K10","S-Presso","Celerio","WagonR","Swift","Baleno","Ignis"],"hatch"),...m(["Dzire","Ciaz"],"sedan"),...m(["Brezza","Fronx","Grand Vitara","Jimny","Ertiga","XL6","Invicto"],"suv")]},
{brand:"Hyundai",models:[...m(["Grand i10 Nios","i20"],"hatch"),...m(["Aura","Verna"],"sedan"),...m(["Exter","Venue","Creta","Alcazar","Tucson"],"suv")]},
{brand:"Tata",models:[...m(["Tiago","Altroz"],"hatch"),...m(["Tigor"],"sedan"),...m(["Punch","Nexon","Curvv","Harrier","Safari","Punch EV","Nexon EV"],"suv")]},
{brand:"Mahindra",models:m(["XUV 3XO","Bolero","Bolero Neo","Thar","Thar Roxx","Scorpio Classic","Scorpio N","XUV700","BE 6","XEV 9e"],"suv")},
{brand:"Kia",models:m(["Sonet","Seltos","Carens","Carnival","EV6","EV9"],"suv")},
{brand:"Toyota",models:[...m(["Glanza"],"hatch"),...m(["Camry"],"sedan"),...m(["Taisor","Urban Cruiser Hyryder","Rumion","Innova Crysta","Innova Hycross","Fortuner","Legender","Hilux","Land Cruiser 300"],"suv")]},
{brand:"Honda",models:[...m(["Amaze","City","City e:HEV"],"sedan"),...m(["Elevate"],"suv")]},
{brand:"Skoda",models:[...m(["Slavia","Superb"],"sedan"),...m(["Kylaq","Kushaq","Kodiaq"],"suv")]},
{brand:"Volkswagen",models:[...m(["Virtus"],"sedan"),...m(["Taigun","Tiguan"],"suv")]},
{brand:"MG",models:m(["Comet EV","Astor","Windsor EV","Hector","Hector Plus","ZS EV","Gloster"],"suv")},
{brand:"Renault",models:[...m(["Kwid"],"hatch"),...m(["Kiger","Triber"],"suv")]},
{brand:"Nissan",models:m(["Magnite","X-Trail"],"suv")},
{brand:"Citroen",models:[...m(["C3"],"hatch"),...m(["C3 Aircross","Basalt","eC3"],"suv")]},
{brand:"Jeep",models:m(["Compass","Meridian","Wrangler","Grand Cherokee"],"premium")},
{brand:"BMW",models:m(["2 Series","3 Series","5 Series","7 Series","X1","X3","X5","X7","iX1","i4","i5","i7"],"premium")},
{brand:"Mercedes-Benz",models:m(["A-Class","C-Class","E-Class","S-Class","GLA","GLB","GLC","GLE","GLS","EQA","EQB","EQS"],"premium")},
{brand:"Audi",models:m(["A4","A6","Q3","Q5","Q7","Q8","e-tron"],"premium")},
{brand:"Volvo",models:m(["EX30","EX40","EC40","XC60","XC90","S90"],"premium")},
{brand:"Land Rover",models:m(["Defender","Discovery Sport","Range Rover Evoque","Range Rover Velar","Range Rover Sport","Range Rover"],"premium")},
{brand:"BYD",models:m(["Atto 3","Seal","Seal U","eMAX 7"],"premium")},
{brand:"Lexus",models:m(["ES","NX","RX","LM","LX"],"premium")}
];
export const CAR_YEARS=Array.from({length:new Date().getFullYear()-1999},(_,i)=>new Date().getFullYear()-i);

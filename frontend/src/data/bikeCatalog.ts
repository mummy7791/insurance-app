export type BikeModel={name:string;class:"standard"|"mid"|"premium"};
export type BikeBrand={brand:string;models:BikeModel[]};
export const BIKE_CATALOG:BikeBrand[]=[
{brand:"Hero",models:["Splendor Plus","HF Deluxe","Passion Plus","Glamour","Super Splendor","Xtreme 125R","Xtreme 160R","Xtreme 200S","Xpulse 200 4V","Karizma XMR"].map(name=>({name,class:/200|Karizma/.test(name)?"mid":"standard"} as BikeModel))},
{brand:"Honda",models:["Shine 100","Shine 125","SP 125","Unicorn","Hornet 2.0","CB200X","CB300F","CB300R","Hness CB350","CB350","CB350RS","Activa 6G","Activa 125","Dio","Dio 125"].map(name=>({name,class:/300|350/.test(name)?"mid":"standard"} as BikeModel))},
{brand:"Bajaj",models:["Platina 100","Platina 110","CT 110X","Pulsar 125","Pulsar 150","Pulsar N150","Pulsar N160","Pulsar NS160","Pulsar NS200","Pulsar RS200","Pulsar N250","Dominar 250","Dominar 400","Avenger 160","Avenger 220"].map(name=>({name,class:/200|220|250|400/.test(name)?"mid":"standard"} as BikeModel))},
{brand:"TVS",models:["Sport","Radeon","Star City Plus","Raider 125","Apache RTR 160","Apache RTR 180","Apache RTR 200 4V","Apache RR 310","Ronin","Jupiter","Jupiter 125","Ntorq 125","iQube"].map(name=>({name,class:/200|310|Ronin/.test(name)?"mid":"standard"} as BikeModel))},
{brand:"Royal Enfield",models:["Hunter 350","Classic 350","Bullet 350","Meteor 350","Himalayan 450","Scram 411","Guerrilla 450","Interceptor 650","Continental GT 650","Super Meteor 650","Shotgun 650"].map(name=>({name,class:/650|450/.test(name)?"premium":"mid"} as BikeModel))},
{brand:"Yamaha",models:["FZ-FI","FZ-S FI","FZ-X","MT-15 V2","R15 V4","R15S","Aerox 155","Fascino 125","RayZR 125"].map(name=>({name,class:/R15|MT-15/.test(name)?"mid":"standard"} as BikeModel))},
{brand:"Suzuki",models:["Gixxer","Gixxer SF","Gixxer 250","Gixxer SF 250","V-Strom SX","Hayabusa","Access 125","Burgman Street","Avenis"].map(name=>({name,class:/Hayabusa/.test(name)?"premium":/250|V-Strom/.test(name)?"mid":"standard"} as BikeModel))},
{brand:"KTM",models:["Duke 200","Duke 250","Duke 390","RC 200","RC 390","Adventure 250","Adventure 390"].map(name=>({name,class:/390/.test(name)?"premium":"mid"} as BikeModel))},
{brand:"Kawasaki",models:["Ninja 300","Ninja 400","Ninja 500","Ninja 650","Ninja ZX-4R","Ninja ZX-6R","Ninja ZX-10R","Z650","Z900","Versys 650"].map(name=>({name,class:"premium"} as BikeModel))},
{brand:"BMW Motorrad",models:["G 310 R","G 310 GS","G 310 RR","F 900 R","S 1000 RR"].map(name=>({name,class:"premium"} as BikeModel))},
{brand:"Jawa",models:["Jawa 350","42","42 Bobber","Perak"].map(name=>({name,class:"mid"} as BikeModel))},
{brand:"Yezdi",models:["Roadster","Scrambler","Adventure"].map(name=>({name,class:"mid"} as BikeModel))},
{brand:"Triumph",models:["Speed 400","Scrambler 400 X","Trident 660","Tiger Sport 660"].map(name=>({name,class:/660/.test(name)?"premium":"mid"} as BikeModel))},
{brand:"Harley-Davidson",models:["X440","Nightster","Sportster S","Fat Bob 114"].map(name=>({name,class:"premium"} as BikeModel))},
{brand:"Aprilia",models:["RS 457","Tuono 457"].map(name=>({name,class:"premium"} as BikeModel))},
{brand:"Hero",models:["Pleasure Plus","Destini 125","Xoom 110","Xoom 125","Vida V1","Vida V2"].map(name=>({name,class:"standard"} as BikeModel))},
{brand:"Bajaj",models:["Chetak"].map(name=>({name,class:"standard"} as BikeModel))},
{brand:"Ather",models:["450S","450X","Rizta"].map(name=>({name,class:"mid"} as BikeModel))},
{brand:"Ola Electric",models:["S1 X","S1 Pro","S1 Air"].map(name=>({name,class:"mid"} as BikeModel))},
{brand:"Electric Bikes",models:["Revolt RV400","Oben Rorr","Tork Kratos R","Ultraviolette F77"].map(name=>({name,class:/F77/.test(name)?"premium":"mid"} as BikeModel))}
];
export const BIKE_YEARS=Array.from({length:new Date().getFullYear()-1999},(_,i)=>new Date().getFullYear()-i);

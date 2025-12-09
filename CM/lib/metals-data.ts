
export interface Facility {
  name: string;
  location: string;
  country: string;
  coordinates?: { lat: number; lng: number };
  capacity?: string;
}

export interface StageMetrics {
  carbonEmissions: number; // kg CO2e per tonne
  energyConsumption: number; // MJ per tonne
  waterUsage: number; // m³ per tonne
  wasteGenerated: number; // kg per tonne
}

export interface CircularLoop {
  targetStage: string; // ID of the stage this loops back to
  materialFlow: string; // Description of what material flows back
  recoveryRate: number; // Percentage of material recovered
  carbonSavings: number; // kg CO2e saved per tonne
}

export interface ByproductManagement {
  name: string;
  description: string;
  managementMethod: 'Disposal' | 'Recycling' | 'Valorization' | 'Storage';
  environmentalRisk: 'Low' | 'Medium' | 'High';
  economicValue: 'Cost' | 'Neutral' | 'Revenue';
  volume: number; // kg per ton of product
  destination?: string; // e.g., "Cement Industry", "Landfill"
  destinationCoordinates?: { lat: number; lng: number };
}

// Logistics interfaces for route optimization
export interface TransportLeg {
  id: string;
  fromStage: string; // Stage ID
  toStage: string; // Stage ID
  fromLocation: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  toLocation: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  material: string; // What is being transported
  mode: 'truck' | 'rail' | 'ship' | 'pipeline' | 'conveyor';
  distance: number; // km
  duration: string; // e.g., "4-6 hours"
  emissions: number; // kg CO2e per tonne transported
  vehicleType?: string; // e.g., "40-ton lorry", "freight train"
  frequency?: string; // e.g., "Daily", "Weekly"
}

export interface LogisticsData {
  transportLegs: TransportLeg[];
  totalDistance: number; // km
  totalTransportEmissions: number; // kg CO2e
}

export interface Ore {
  id: string;
  name: string;
  mineralogy: string;
  gradeRange: string;
  associatedMetals: string[];
  byproducts: string[];
  regions: string[];
  processingRoutes: ProcessingRoute[];
}

export interface ProcessingRoute {
  id: string;
  name: string;
  stages: Stage[];
  totalCarbon?: number; // Total kg CO2e per tonne
  totalEnergy?: number; // Total MJ per tonne
  circularityScore?: number; // 0-100
  logistics?: LogisticsData; // Transport logistics with coordinates
}

export interface Stage {
  id: string;
  name: string;
  type: 'extraction' | 'beneficiation' | 'smelting' | 'refining' | 'manufacturing' | 'use' | 'eol' | 'recycling';
  description: string;
  inputs: string[];
  outputs: string[];
  energy: string;
  emissions: string;
  circularityPotential: string;
  // Enhanced fields
  facility?: Facility;
  metrics?: StageMetrics;
  circularLoops?: CircularLoop[];
  byproductFlows?: ByproductManagement[];
  duration?: string; // e.g., "2-4 weeks"
  transportMode?: string; // e.g., "Rail", "Ship", "Truck"
  transportDistance?: number; // km to next stage
}

export interface Metal {
  id: string;
  name: string;
  symbol: string;
  category: string;
  ores: Ore[];
}

export const METALS_DATA: Metal[] = [
  {
    id: 'aluminium',
    name: 'Aluminium',
    symbol: 'Al',
    category: 'Light Metals',
    ores: [
      {
        id: 'bauxite',
        name: 'Bauxite',
        mineralogy: 'Gibbsite, Boehmite, Diaspore',
        gradeRange: '30-60% Al2O3',
        associatedMetals: ['Gallium', 'Titanium', 'Iron'],
        byproducts: ['Red Mud', 'Gallium'],
        regions: ['Australia', 'Guinea', 'Brazil', 'India'],
        processingRoutes: [
          {
            id: 'bayer-hall-heroult',
            name: 'Bayer Process + Hall-Héroult',
            totalCarbon: 12500,
            totalEnergy: 170000,
            circularityScore: 75,
            stages: [
              { 
                id: 'mining', 
                name: 'Bauxite Mining', 
                type: 'extraction', 
                description: 'Open pit mining and ore extraction',
                inputs: ['Land', 'Diesel', 'Explosives', 'Water'],
                outputs: ['Bauxite Ore', 'Overburden'],
                energy: '50 MJ/t',
                emissions: '15 kg CO2e/t',
                circularityPotential: 'Low',
                facility: { name: 'Hindalco Mines', location: 'Odisha', country: 'India' },
                metrics: { carbonEmissions: 15, energyConsumption: 50, waterUsage: 2.5, wasteGenerated: 500 },
                duration: '1-2 days',
                transportMode: 'Truck',
                transportDistance: 150
              },
              { 
                id: 'refining', 
                name: 'Alumina Refining (Bayer)', 
                type: 'beneficiation', 
                description: 'Digestion with NaOH to extract alumina',
                inputs: ['Bauxite', 'Caustic Soda (NaOH)', 'Steam', 'Lime'],
                outputs: ['Alumina (Al2O3)', 'Red Mud'],
                energy: '14,000 MJ/t',
                emissions: '1,500 kg CO2e/t',
                circularityPotential: 'Medium - Red Mud valorization possible',
                facility: { name: 'Hindalco Alumina Refinery', location: 'Belgaum, Karnataka', country: 'India' },
                metrics: { carbonEmissions: 1500, energyConsumption: 14000, waterUsage: 3.0, wasteGenerated: 2000 },
                circularLoops: [
                  { targetStage: 'mining', materialFlow: 'Red Mud for land rehabilitation', recoveryRate: 15, carbonSavings: 50 }
                ],
                byproductFlows: [
                  {
                    name: 'Red Mud (Bauxite Residue)',
                    description: 'Highly alkaline waste product from alumina refining.',
                    managementMethod: 'Storage',
                    environmentalRisk: 'High',
                    economicValue: 'Cost',
                    volume: 1500,
                    destination: 'Residue Storage Areas'
                  }
                ],
                duration: '3-5 days',
                transportMode: 'Rail',
                transportDistance: 800
              },
              { 
                id: 'smelting', 
                name: 'Aluminium Smelting (Hall-Héroult)', 
                type: 'smelting', 
                description: 'Electrolytic reduction of alumina to aluminium',
                inputs: ['Alumina', 'Electricity', 'Carbon Anodes', 'Cryolite'],
                outputs: ['Primary Aluminium', 'CO2', 'PFCs', 'Spent Pot Lining'],
                energy: '55,000 MJ/t',
                emissions: '8,000 kg CO2e/t',
                circularityPotential: 'Low - High energy, but SPL recycling emerging',
                facility: { name: 'Vedanta Aluminium Smelter', location: 'Jharsuguda, Odisha', country: 'India' },
                metrics: { carbonEmissions: 8000, energyConsumption: 55000, waterUsage: 1.5, wasteGenerated: 35 },
                byproductFlows: [
                  {
                    name: 'Spent Pot Lining (SPL)',
                    description: 'Hazardous waste from electrolytic cells.',
                    managementMethod: 'Recycling',
                    environmentalRisk: 'High',
                    economicValue: 'Cost',
                    volume: 25,
                    destination: 'Cement Industry / Treatment Plant'
                  }
                ],
                duration: '24-48 hours',
                transportMode: 'Rail',
                transportDistance: 500
              },
              { 
                id: 'casting', 
                name: 'Casting & Fabrication', 
                type: 'manufacturing', 
                description: 'Casting into ingots, billets, or sheets',
                inputs: ['Molten Aluminium', 'Alloying Elements', 'Energy'],
                outputs: ['Aluminium Ingots', 'Billets', 'Sheets'],
                energy: '2,500 MJ/t',
                emissions: '200 kg CO2e/t',
                circularityPotential: 'High - Scrap from fabrication recycled',
                facility: { name: 'Hindalco Rolling Mill', location: 'Hirakud, Odisha', country: 'India' },
                metrics: { carbonEmissions: 200, energyConsumption: 2500, waterUsage: 0.5, wasteGenerated: 50 },
                circularLoops: [
                  { targetStage: 'smelting', materialFlow: 'Production scrap', recoveryRate: 95, carbonSavings: 7500 }
                ],
                duration: '1-2 days',
                transportMode: 'Truck',
                transportDistance: 200
              },
              { 
                id: 'manufacturing', 
                name: 'Product Manufacturing', 
                type: 'manufacturing', 
                description: 'Forming into final products (automotive, packaging, construction)',
                inputs: ['Aluminium Sheets/Billets', 'Energy', 'Lubricants'],
                outputs: ['Finished Products', 'Manufacturing Scrap'],
                energy: '1,500 MJ/t',
                emissions: '150 kg CO2e/t',
                circularityPotential: 'High - Closed-loop manufacturing scrap',
                facility: { name: 'Tata AutoComp', location: 'Pune, Maharashtra', country: 'India' },
                metrics: { carbonEmissions: 150, energyConsumption: 1500, waterUsage: 0.3, wasteGenerated: 80 },
                circularLoops: [
                  { targetStage: 'smelting', materialFlow: 'New scrap to smelter', recoveryRate: 98, carbonSavings: 7800 }
                ],
                duration: '1-7 days',
                transportMode: 'Truck',
                transportDistance: 100
              },
              { 
                id: 'use', 
                name: 'Use Phase', 
                type: 'use', 
                description: 'Product in service (automotive: 15 years, packaging: weeks, construction: 50+ years)',
                inputs: ['Finished Product'],
                outputs: ['Service Life', 'End-of-Life Product'],
                energy: 'Variable',
                emissions: 'Depends on application',
                circularityPotential: 'High durability extends material value',
                metrics: { carbonEmissions: 0, energyConsumption: 0, waterUsage: 0, wasteGenerated: 0 },
                duration: '1-50 years'
              },
              { 
                id: 'eol', 
                name: 'End of Life Collection', 
                type: 'eol', 
                description: 'Collection and sorting of post-consumer aluminium scrap',
                inputs: ['End-of-Life Products'],
                outputs: ['Sorted Aluminium Scrap', 'Contaminants'],
                energy: '200 MJ/t',
                emissions: '30 kg CO2e/t',
                circularityPotential: 'Critical for circular economy',
                facility: { name: 'MSTC Recycling Hub', location: 'Chennai, Tamil Nadu', country: 'India' },
                metrics: { carbonEmissions: 30, energyConsumption: 200, waterUsage: 0.1, wasteGenerated: 100 },
                duration: 'Varies',
                transportMode: 'Truck',
                transportDistance: 300
              },
              { 
                id: 'recycling', 
                name: 'Secondary Aluminium Production', 
                type: 'recycling', 
                description: 'Remelting scrap to produce recycled aluminium (95% energy savings)',
                inputs: ['Aluminium Scrap', 'Flux', 'Energy'],
                outputs: ['Secondary Aluminium', 'Dross', 'Salt Slag'],
                energy: '2,800 MJ/t',
                emissions: '400 kg CO2e/t',
                circularityPotential: 'Very High - 95% energy savings vs primary',
                facility: { name: 'Vedanta Recycling', location: 'Jharsuguda, Odisha', country: 'India' },
                metrics: { carbonEmissions: 400, energyConsumption: 2800, waterUsage: 0.5, wasteGenerated: 150 },
                circularLoops: [
                  { targetStage: 'casting', materialFlow: 'Recycled aluminium to casting', recoveryRate: 92, carbonSavings: 9600 },
                  { targetStage: 'refining', materialFlow: 'Dross to alumina recovery', recoveryRate: 70, carbonSavings: 200 }
                ],
                duration: '1-3 days',
                transportMode: 'Rail',
                transportDistance: 50
              }
            ]
          }
        ]
      },
      {
        id: 'nepheline',
        name: 'Nepheline',
        mineralogy: 'Nepheline Syenite',
        gradeRange: '20-30% Al2O3',
        associatedMetals: ['Potassium', 'Sodium'],
        byproducts: ['Cement raw materials'],
        regions: ['Russia'],
        processingRoutes: []
      }
    ]
  },
  {
    id: 'copper',
    name: 'Copper',
    symbol: 'Cu',
    category: 'Base Metals',
    ores: [
      {
        id: 'chalcopyrite',
        name: 'Chalcopyrite',
        mineralogy: 'CuFeS2',
        gradeRange: '0.5-2.0% Cu',
        associatedMetals: ['Gold', 'Silver', 'Molybdenum'],
        byproducts: ['Sulfuric Acid', 'Slag', 'Precious Metals'],
        regions: ['Chile', 'Peru', 'India', 'Zambia'],
        processingRoutes: [
          {
            id: 'pyrometallurgy',
            name: 'Conventional Pyrometallurgy',
            totalCarbon: 3800,
            totalEnergy: 45000,
            circularityScore: 65,
            stages: [
              { 
                id: 'mining', 
                name: 'Copper Ore Mining', 
                type: 'extraction', 
                description: 'Open pit or underground mining',
                inputs: ['Land', 'Diesel', 'Explosives', 'Water'],
                outputs: ['Copper Ore', 'Waste Rock'],
                energy: '100 MJ/t ore',
                emissions: '25 kg CO2e/t ore',
                circularityPotential: 'Low',
                facility: { name: 'Hindustan Copper', location: 'Malanjkhand, MP', country: 'India' },
                metrics: { carbonEmissions: 25, energyConsumption: 100, waterUsage: 5.0, wasteGenerated: 1500 },
                duration: '1-3 days',
                transportMode: 'Truck',
                transportDistance: 50
              },
              { 
                id: 'flotation', 
                name: 'Froth Flotation', 
                type: 'beneficiation', 
                description: 'Concentration to ~30% Cu',
                inputs: ['Crushed Ore', 'Reagents', 'Water'],
                outputs: ['Copper Concentrate', 'Tailings'],
                energy: '200 MJ/t',
                emissions: '40 kg CO2e/t',
                circularityPotential: 'Medium - Tailings storage/reprocessing',
                facility: { name: 'HCL Concentrator', location: 'Khetri, Rajasthan', country: 'India' },
                metrics: { carbonEmissions: 40, energyConsumption: 200, waterUsage: 15.0, wasteGenerated: 950 },
                byproductFlows: [
                  {
                    name: 'Tailings',
                    description: 'Fine waste rock slurry after mineral extraction.',
                    managementMethod: 'Storage',
                    environmentalRisk: 'High',
                    economicValue: 'Cost',
                    volume: 950,
                    destination: 'Tailings Dam'
                  }
                ],
                duration: '4-8 hours',
                transportMode: 'Conveyor',
                transportDistance: 5
              },
              { 
                id: 'smelting', 
                name: 'Matte Smelting', 
                type: 'smelting', 
                description: 'Flash smelting to copper matte',
                inputs: ['Concentrate', 'Silica Flux', 'Oxygen'],
                outputs: ['Copper Matte', 'Slag', 'SO2 Gas'],
                energy: '15,000 MJ/t',
                emissions: '1,200 kg CO2e/t',
                circularityPotential: 'High - Slag used in construction',
                facility: { name: 'Sterlite Copper Smelter', location: 'Tuticorin, TN', country: 'India' },
                metrics: { carbonEmissions: 1200, energyConsumption: 15000, waterUsage: 8.0, wasteGenerated: 2200 },
                circularLoops: [
                  { targetStage: 'mining', materialFlow: 'Slag for road construction', recoveryRate: 80, carbonSavings: 50 }
                ],
                byproductFlows: [
                  {
                    name: 'Copper Slag',
                    description: 'Silicate waste from smelting process.',
                    managementMethod: 'Valorization',
                    environmentalRisk: 'Low',
                    economicValue: 'Revenue',
                    volume: 2200,
                    destination: 'Construction / Abrasives'
                  },
                  {
                    name: 'Sulfuric Acid',
                    description: 'Captured SO2 gas converted to acid.',
                    managementMethod: 'Valorization',
                    environmentalRisk: 'Medium',
                    economicValue: 'Revenue',
                    volume: 2800,
                    destination: 'Fertilizer Industry'
                  }
                ],
                duration: '6-12 hours',
                transportMode: 'Rail',
                transportDistance: 1200
              },
              { 
                id: 'converting', 
                name: 'Converting', 
                type: 'refining', 
                description: 'Pierce-Smith converting to blister copper',
                inputs: ['Copper Matte', 'Air'],
                outputs: ['Blister Copper', 'SO2', 'Converter Slag'],
                energy: '3,000 MJ/t',
                emissions: '400 kg CO2e/t',
                circularityPotential: 'Medium',
                facility: { name: 'Sterlite Converter', location: 'Tuticorin, TN', country: 'India' },
                metrics: { carbonEmissions: 400, energyConsumption: 3000, waterUsage: 2.0, wasteGenerated: 150 },
                duration: '4-6 hours',
                transportMode: 'Internal',
                transportDistance: 0.5
              },
              { 
                id: 'electrorefining', 
                name: 'Electrorefining', 
                type: 'refining', 
                description: 'Electrolytic refining to 99.99% Cu cathode',
                inputs: ['Blister Copper', 'Sulfuric Acid', 'Electricity'],
                outputs: ['Copper Cathode (LME Grade)', 'Anode Slime'],
                energy: '2,500 MJ/t',
                emissions: '350 kg CO2e/t',
                circularityPotential: 'Very High - Precious metals recovery from slimes',
                facility: { name: 'Birla Copper Refinery', location: 'Dahej, Gujarat', country: 'India' },
                metrics: { carbonEmissions: 350, energyConsumption: 2500, waterUsage: 3.0, wasteGenerated: 25 },
                circularLoops: [
                  { targetStage: 'manufacturing', materialFlow: 'Precious metals to jewellery', recoveryRate: 95, carbonSavings: 500 }
                ],
                byproductFlows: [
                  {
                    name: 'Anode Slime',
                    description: 'Residue containing precious metals (Au, Ag, Pt).',
                    managementMethod: 'Valorization',
                    environmentalRisk: 'Low',
                    economicValue: 'Revenue',
                    volume: 5,
                    destination: 'Precious Metals Refinery'
                  }
                ],
                duration: '14-21 days',
                transportMode: 'Truck',
                transportDistance: 300
              },
              { 
                id: 'manufacturing', 
                name: 'Copper Product Manufacturing', 
                type: 'manufacturing', 
                description: 'Wire rod, tubes, sheets production',
                inputs: ['Copper Cathode', 'Energy'],
                outputs: ['Copper Wire', 'Tubes', 'Sheets'],
                energy: '1,800 MJ/t',
                emissions: '180 kg CO2e/t',
                circularityPotential: 'High - Manufacturing scrap recycled',
                facility: { name: 'Hindalco Copper Rod Plant', location: 'Silvassa', country: 'India' },
                metrics: { carbonEmissions: 180, energyConsumption: 1800, waterUsage: 0.5, wasteGenerated: 30 },
                circularLoops: [
                  { targetStage: 'electrorefining', materialFlow: 'Clean scrap to refinery', recoveryRate: 98, carbonSavings: 2800 }
                ],
                duration: '1-3 days',
                transportMode: 'Truck',
                transportDistance: 200
              },
              { 
                id: 'use', 
                name: 'Use Phase', 
                type: 'use', 
                description: 'Electrical wiring (30-50 years), electronics (5-10 years)',
                inputs: ['Copper Products'],
                outputs: ['Service', 'End-of-Life Products'],
                energy: 'Variable',
                emissions: 'Application dependent',
                circularityPotential: 'Excellent - Copper fully recyclable',
                metrics: { carbonEmissions: 0, energyConsumption: 0, waterUsage: 0, wasteGenerated: 0 },
                duration: '5-50 years'
              },
              { 
                id: 'eol', 
                name: 'End of Life Collection', 
                type: 'eol', 
                description: 'E-waste and construction scrap collection',
                inputs: ['End-of-Life Products'],
                outputs: ['Copper Scrap', 'Mixed Metals'],
                energy: '150 MJ/t',
                emissions: '25 kg CO2e/t',
                circularityPotential: 'Essential for circular economy',
                facility: { name: 'Attero Recycling', location: 'Roorkee, Uttarakhand', country: 'India' },
                metrics: { carbonEmissions: 25, energyConsumption: 150, waterUsage: 0.2, wasteGenerated: 200 },
                duration: 'Ongoing',
                transportMode: 'Truck',
                transportDistance: 400
              },
              { 
                id: 'recycling', 
                name: 'Secondary Copper Production', 
                type: 'recycling', 
                description: 'Scrap remelting and refining',
                inputs: ['Copper Scrap', 'Energy'],
                outputs: ['Recycled Copper', 'Slag'],
                energy: '3,500 MJ/t',
                emissions: '450 kg CO2e/t',
                circularityPotential: 'Very High - 85% energy savings',
                facility: { name: 'Hindalco Copper Recycling', location: 'Mouda, Maharashtra', country: 'India' },
                metrics: { carbonEmissions: 450, energyConsumption: 3500, waterUsage: 1.0, wasteGenerated: 100 },
                circularLoops: [
                  { targetStage: 'manufacturing', materialFlow: 'Secondary copper to rod plant', recoveryRate: 90, carbonSavings: 3200 }
                ],
                duration: '2-5 days',
                transportMode: 'Rail',
                transportDistance: 100
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'steel',
    name: 'Steel',
    symbol: 'Fe',
    category: 'Ferrous Metals',
    ores: [
      {
        id: 'hematite',
        name: 'Hematite',
        mineralogy: 'Fe2O3',
        gradeRange: '50-65% Fe',
        associatedMetals: [],
        byproducts: ['Slag'],
        regions: ['Australia', 'Brazil', 'India'],
        processingRoutes: [
          {
            id: 'bf-bof',
            name: 'Blast Furnace - Basic Oxygen Furnace',
            totalCarbon: 2100,
            totalEnergy: 25000,
            circularityScore: 70,
            stages: [
              { 
                id: 'mining', 
                name: 'Iron Ore Mining', 
                type: 'extraction', 
                description: 'Open pit mining of iron ore',
                inputs: ['Land', 'Diesel', 'Explosives'],
                outputs: ['Iron Ore', 'Overburden'],
                energy: '45 MJ/t',
                emissions: '12 kg CO2e/t',
                circularityPotential: 'Low',
                facility: { name: 'NMDC Iron Ore Mine', location: 'Bailadila, Chhattisgarh', country: 'India' },
                metrics: { carbonEmissions: 12, energyConsumption: 45, waterUsage: 2.0, wasteGenerated: 400 },
                duration: '1-2 days',
                transportMode: 'Rail',
                transportDistance: 500
              },
              { 
                id: 'pelletizing', 
                name: 'Pelletizing', 
                type: 'beneficiation', 
                description: 'Iron ore pellet production',
                inputs: ['Iron Ore Fines', 'Bentonite', 'Energy'],
                outputs: ['Iron Ore Pellets'],
                energy: '800 MJ/t',
                emissions: '80 kg CO2e/t',
                circularityPotential: 'Medium',
                facility: { name: 'JSW Pellet Plant', location: 'Vijayanagar, Karnataka', country: 'India' },
                metrics: { carbonEmissions: 80, energyConsumption: 800, waterUsage: 0.5, wasteGenerated: 50 },
                duration: '2-4 hours',
                transportMode: 'Conveyor',
                transportDistance: 2
              },
              { 
                id: 'ironmaking', 
                name: 'Blast Furnace Ironmaking', 
                type: 'smelting', 
                description: 'Reduction of iron ore to pig iron',
                inputs: ['Iron Ore/Pellets', 'Coke', 'Limestone', 'Hot Blast'],
                outputs: ['Pig Iron', 'Slag', 'BF Gas'],
                energy: '14,000 MJ/t',
                emissions: '1,400 kg CO2e/t',
                circularityPotential: 'Medium - Slag for cement',
                facility: { name: 'Tata Steel Blast Furnace', location: 'Jamshedpur, Jharkhand', country: 'India' },
                metrics: { carbonEmissions: 1400, energyConsumption: 14000, waterUsage: 4.0, wasteGenerated: 300 },
                circularLoops: [
                  { targetStage: 'pelletizing', materialFlow: 'BF gas for heating', recoveryRate: 90, carbonSavings: 150 }
                ],
                byproductFlows: [
                  {
                    name: 'Blast Furnace Slag',
                    description: 'Molten slag quenched to form granules.',
                    managementMethod: 'Valorization',
                    environmentalRisk: 'Low',
                    economicValue: 'Revenue',
                    volume: 300,
                    destination: 'Cement Industry (GGBS)'
                  },
                  {
                    name: 'Blast Furnace Gas',
                    description: 'Low calorific value gas.',
                    managementMethod: 'Valorization',
                    environmentalRisk: 'Medium',
                    economicValue: 'Revenue',
                    volume: 1500,
                    destination: 'Power Plant / Heating'
                  }
                ],
                duration: '4-6 hours',
                transportMode: 'Internal',
                transportDistance: 0.2
              },
              { 
                id: 'steelmaking', 
                name: 'BOF Steelmaking', 
                type: 'refining', 
                description: 'Basic Oxygen Furnace steelmaking',
                inputs: ['Pig Iron', 'Scrap (15-25%)', 'Oxygen', 'Lime'],
                outputs: ['Liquid Steel', 'BOF Slag', 'Off-gas'],
                energy: '800 MJ/t',
                emissions: '200 kg CO2e/t',
                circularityPotential: 'High - Scrap integration',
                facility: { name: 'Tata Steel BOF Shop', location: 'Jamshedpur, Jharkhand', country: 'India' },
                metrics: { carbonEmissions: 200, energyConsumption: 800, waterUsage: 2.0, wasteGenerated: 120 },
                circularLoops: [
                  { targetStage: 'steelmaking', materialFlow: 'Internal scrap recirculation', recoveryRate: 100, carbonSavings: 400 }
                ],
                byproductFlows: [
                  {
                    name: 'BOF Slag',
                    description: 'Steelmaking slag rich in lime and iron.',
                    managementMethod: 'Valorization',
                    environmentalRisk: 'Low',
                    economicValue: 'Neutral',
                    volume: 120,
                    destination: 'Road Construction / Agriculture'
                  }
                ],
                duration: '40-50 minutes',
                transportMode: 'Ladle',
                transportDistance: 0.1
              },
              { 
                id: 'casting', 
                name: 'Continuous Casting', 
                type: 'manufacturing', 
                description: 'Casting into slabs, billets, blooms',
                inputs: ['Liquid Steel'],
                outputs: ['Steel Slabs', 'Billets', 'Blooms'],
                energy: '200 MJ/t',
                emissions: '20 kg CO2e/t',
                circularityPotential: 'High',
                facility: { name: 'JSW Caster', location: 'Vijayanagar, Karnataka', country: 'India' },
                metrics: { carbonEmissions: 20, energyConsumption: 200, waterUsage: 3.0, wasteGenerated: 10 },
                duration: '30 minutes',
                transportMode: 'Roller Table',
                transportDistance: 0.05
              },
              { 
                id: 'rolling', 
                name: 'Hot/Cold Rolling', 
                type: 'manufacturing', 
                description: 'Rolling into sheets, coils, bars',
                inputs: ['Steel Semis', 'Energy'],
                outputs: ['Steel Sheets', 'Coils', 'Bars'],
                energy: '1,500 MJ/t',
                emissions: '120 kg CO2e/t',
                circularityPotential: 'High - Mill scale recycled',
                facility: { name: 'SAIL Rolling Mill', location: 'Bhilai, Chhattisgarh', country: 'India' },
                metrics: { carbonEmissions: 120, energyConsumption: 1500, waterUsage: 1.5, wasteGenerated: 40 },
                circularLoops: [
                  { targetStage: 'ironmaking', materialFlow: 'Mill scale to sinter plant', recoveryRate: 100, carbonSavings: 30 }
                ],
                duration: '2-4 hours',
                transportMode: 'Truck/Rail',
                transportDistance: 300
              },
              { 
                id: 'manufacturing', 
                name: 'Product Manufacturing', 
                type: 'manufacturing', 
                description: 'Automotive, construction, appliances',
                inputs: ['Steel Products', 'Energy'],
                outputs: ['Finished Steel Products', 'Fabrication Scrap'],
                energy: '500 MJ/t',
                emissions: '50 kg CO2e/t',
                circularityPotential: 'High',
                facility: { name: 'Mahindra Automotive', location: 'Chennai, TN', country: 'India' },
                metrics: { carbonEmissions: 50, energyConsumption: 500, waterUsage: 0.3, wasteGenerated: 100 },
                circularLoops: [
                  { targetStage: 'steelmaking', materialFlow: 'Prompt scrap to BOF', recoveryRate: 95, carbonSavings: 1800 }
                ],
                duration: '1-5 days',
                transportMode: 'Truck',
                transportDistance: 150
              },
              { 
                id: 'use', 
                name: 'Use Phase', 
                type: 'use', 
                description: 'Buildings (50-100 years), vehicles (15-20 years)',
                inputs: ['Steel Products'],
                outputs: ['Service', 'End-of-Life Steel'],
                energy: 'Minimal',
                emissions: 'Maintenance related',
                circularityPotential: 'Excellent longevity',
                metrics: { carbonEmissions: 0, energyConsumption: 0, waterUsage: 0, wasteGenerated: 0 },
                duration: '15-100 years'
              },
              { 
                id: 'eol', 
                name: 'End of Life Collection', 
                type: 'eol', 
                description: 'Demolition and vehicle scrapping',
                inputs: ['End-of-Life Steel Products'],
                outputs: ['Steel Scrap', 'Mixed Waste'],
                energy: '100 MJ/t',
                emissions: '15 kg CO2e/t',
                circularityPotential: 'Critical - 85%+ recovery rate',
                facility: { name: 'MSTC Vehicle Scrapping', location: 'Greater Noida, UP', country: 'India' },
                metrics: { carbonEmissions: 15, energyConsumption: 100, waterUsage: 0.1, wasteGenerated: 150 },
                duration: 'Varies',
                transportMode: 'Truck',
                transportDistance: 200
              },
              { 
                id: 'recycling', 
                name: 'EAF Steel Recycling', 
                type: 'recycling', 
                description: 'Electric Arc Furnace steelmaking from scrap',
                inputs: ['Steel Scrap', 'Electricity', 'Lime'],
                outputs: ['Recycled Steel', 'EAF Slag', 'Dust'],
                energy: '2,000 MJ/t',
                emissions: '400 kg CO2e/t',
                circularityPotential: 'Very High - 75% CO2 reduction',
                facility: { name: 'JSW Electric Steel', location: 'Salem, TN', country: 'India' },
                metrics: { carbonEmissions: 400, energyConsumption: 2000, waterUsage: 1.0, wasteGenerated: 150 },
                circularLoops: [
                  { targetStage: 'casting', materialFlow: 'Recycled steel to caster', recoveryRate: 98, carbonSavings: 1700 },
                  { targetStage: 'steelmaking', materialFlow: 'EAF slag to BOF', recoveryRate: 50, carbonSavings: 30 }
                ],
                duration: '1-2 hours tap-to-tap',
                transportMode: 'Rail',
                transportDistance: 100
              }
            ]
          }
        ]
      },
      {
        id: 'magnetite',
        name: 'Magnetite',
        mineralogy: 'Fe3O4',
        gradeRange: '25-40% Fe',
        associatedMetals: ['Vanadium'],
        byproducts: ['Tailings'],
        regions: ['China', 'Russia', 'USA'],
        processingRoutes: []
      }
    ]
  },
  {
    id: 'nickel',
    name: 'Nickel',
    symbol: 'Ni',
    category: 'Base Metals',
    ores: [
      { id: 'laterite', name: 'Laterite', mineralogy: 'Limonite, Saprolite', gradeRange: '1-2% Ni', associatedMetals: ['Cobalt', 'Iron'], byproducts: [], regions: ['Indonesia', 'Philippines'], processingRoutes: [] },
      { id: 'sulfide', name: 'Sulfide', mineralogy: 'Pentlandite', gradeRange: '1-3% Ni', associatedMetals: ['Copper', 'PGMs', 'Cobalt'], byproducts: [], regions: ['Canada', 'Russia'], processingRoutes: [] }
    ]
  },
  {
    id: 'lithium',
    name: 'Lithium',
    symbol: 'Li',
    category: 'Battery Metals',
    ores: [
      { id: 'spodumene', name: 'Spodumene', mineralogy: 'LiAl(SiO3)2', gradeRange: '1-2% Li2O', associatedMetals: ['Tantalum'], byproducts: [], regions: ['Australia'], processingRoutes: [] },
      { id: 'brine', name: 'Brine', mineralogy: 'Lithium Chloride', gradeRange: '0.05-0.2% Li', associatedMetals: ['Potassium', 'Boron'], byproducts: [], regions: ['Chile', 'Argentina'], processingRoutes: [] }
    ]
  },
  { id: 'cobalt', name: 'Cobalt', symbol: 'Co', category: 'Battery Metals', ores: [] },
  { id: 'zinc', name: 'Zinc', symbol: 'Zn', category: 'Base Metals', ores: [] },
  { id: 'lead', name: 'Lead', symbol: 'Pb', category: 'Base Metals', ores: [] },
  { id: 'titanium', name: 'Titanium', symbol: 'Ti', category: 'Light Metals', ores: [] },
  { id: 'magnesium', name: 'Magnesium', symbol: 'Mg', category: 'Light Metals', ores: [] },
  { id: 'tin', name: 'Tin', symbol: 'Sn', category: 'Base Metals', ores: [] },
  { id: 'manganese', name: 'Manganese', symbol: 'Mn', category: 'Ferrous Metals', ores: [] },
  { id: 'chromium', name: 'Chromium', symbol: 'Cr', category: 'Ferrous Metals', ores: [] },
  { id: 'pgm', name: 'Platinum Group Metals', symbol: 'PGM', category: 'Precious Metals', ores: [] },
  { id: 'silver', name: 'Silver', symbol: 'Ag', category: 'Precious Metals', ores: [] },
  { id: 'gold', name: 'Gold', symbol: 'Au', category: 'Precious Metals', ores: [] },
  { id: 'ree', name: 'Rare Earth Elements', symbol: 'REE', category: 'Strategic Metals', ores: [] },
  { id: 'scandium', name: 'Scandium', symbol: 'Sc', category: 'Strategic Metals', ores: [] },
  { id: 'vanadium', name: 'Vanadium', symbol: 'V', category: 'Ferrous Metals', ores: [] },
  { id: 'tungsten', name: 'Tungsten', symbol: 'W', category: 'Strategic Metals', ores: [] },
];

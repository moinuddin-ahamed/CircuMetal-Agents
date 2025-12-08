
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
        regions: ['Australia', 'Guinea', 'Brazil'],
        processingRoutes: [
          {
            id: 'bayer-hall-heroult',
            name: 'Bayer Process + Hall-Héroult',
            stages: [
              { id: 'mining', name: 'Bauxite Mining', type: 'extraction', description: 'Open pit mining', inputs: ['Land', 'Diesel'], outputs: ['Bauxite'], energy: 'Low', emissions: 'Low', circularityPotential: 'Low' },
              { id: 'refining', name: 'Alumina Refining (Bayer)', type: 'beneficiation', description: 'Digestion with NaOH', inputs: ['Bauxite', 'NaOH', 'Steam'], outputs: ['Alumina', 'Red Mud'], energy: 'High', emissions: 'Medium', circularityPotential: 'Medium (Red Mud valorization)' },
              { id: 'smelting', name: 'Aluminium Smelting (Hall-Héroult)', type: 'smelting', description: 'Electrolysis', inputs: ['Alumina', 'Electricity', 'Carbon Anodes'], outputs: ['Primary Aluminium', 'CO2', 'PFCs'], energy: 'Very High', emissions: 'High', circularityPotential: 'Low' }
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
        regions: ['Chile', 'Peru', 'USA'],
        processingRoutes: [
          {
            id: 'pyrometallurgy',
            name: 'Conventional Pyrometallurgy',
            stages: [
              { id: 'mining', name: 'Mining', type: 'extraction', description: 'Open pit or underground', inputs: [], outputs: [], energy: 'Medium', emissions: 'Medium', circularityPotential: 'Low' },
              { id: 'flotation', name: 'Froth Flotation', type: 'beneficiation', description: 'Concentration', inputs: [], outputs: ['Copper Concentrate', 'Tailings'], energy: 'Medium', emissions: 'Low', circularityPotential: 'Medium' },
              { id: 'smelting', name: 'Matte Smelting', type: 'smelting', description: 'Flash smelting', inputs: [], outputs: ['Matte', 'Slag', 'SO2'], energy: 'High', emissions: 'High', circularityPotential: 'High (Slag use)' },
              { id: 'converting', name: 'Converting', type: 'refining', description: 'Pierce-Smith', inputs: [], outputs: ['Blister Copper'], energy: 'Medium', emissions: 'Medium', circularityPotential: 'Low' },
              { id: 'electrorefining', name: 'Electrorefining', type: 'refining', description: 'Electrolysis', inputs: [], outputs: ['Cathode Copper', 'Anode Slime'], energy: 'Medium', emissions: 'Low', circularityPotential: 'High (PM recovery)' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'iron',
    name: 'Iron',
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
        regions: ['Australia', 'Brazil'],
        processingRoutes: []
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
  // Adding placeholders for the rest to ensure 20+ metals structure exists
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

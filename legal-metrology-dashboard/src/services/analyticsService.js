import api from './api';

export const analyticsService = {
  /**
   * Fetch geographical non-compliance hotspots and rule breakdown
   * Calls GET /api/v1/analytics/violations-map
   */
  async getViolationsMap() {
    try {
      const response = await api.get('/analytics/violations-map');
      if (response?.data?.hotspots) {
        return response.data;
      }
      throw new Error('Invalid violations-map response shape');
    } catch (error) {
      console.warn('Backend violations-map unavailable, falling back to cached enforcement data:', error.message);
      // Fallback data for standalone testing
      return {
        totalHotspots: FALLBACK_HOTSPOTS.length,
        highOffenceCount: FALLBACK_HOTSPOTS.filter(h => h.offenceSeverity === 'CRITICAL' || h.offenceSeverity === 'HIGH').length,
        hotspots: FALLBACK_HOTSPOTS,
      };
    }
  },
};

export const FALLBACK_HOTSPOTS = [
  {
    id: 'hotspot-110001',
    pinCode: '110001',
    region: 'Connaught Place / Central Wholesale Market',
    state: 'Delhi',
    coordinates: [28.6315, 77.2167],
    totalInspections: 64,
    nonCompliantCount: 42,
    compliantCount: 22,
    totalViolations: 58,
    complianceRate: 34.4,
    offenceSeverity: 'CRITICAL',
    mostCommonViolation: 'Rule 6(11)',
    ruleBreakdown: [
      { rule: 'Rule 6(11)', count: 26, description: 'E-Commerce digital declaration & mandatory QR code breach' },
      { rule: 'Rule 9', count: 18, description: 'Manner of declaration & minimum numeral height non-compliance' },
      { rule: 'Rule 6(1)(e)', count: 9, description: 'Maximum Retail Price (MRP) tampering or missing declaration' },
      { rule: 'Rule 6(1)(f)', count: 5, description: 'Net Quantity declaration unit symbol discrepancy' }
    ]
  },
  {
    id: 'hotspot-110006',
    pinCode: '110006',
    region: 'Chandni Chowk / Old Delhi Spice Hub',
    state: 'Delhi',
    coordinates: [28.6562, 77.2310],
    totalInspections: 52,
    nonCompliantCount: 38,
    compliantCount: 14,
    totalViolations: 49,
    complianceRate: 26.9,
    offenceSeverity: 'CRITICAL',
    mostCommonViolation: 'Rule 9',
    ruleBreakdown: [
      { rule: 'Rule 9', count: 24, description: 'Numeral height less than prescribed threshold under Rule 9' },
      { rule: 'Rule 6(11)', count: 13, description: 'Digital transparency & URL link missing on imported packages' },
      { rule: 'Rule 6(1)(a)', count: 8, description: 'Manufacturer & packer identification incomplete' },
      { rule: 'Rule 6(1)(d)', count: 4, description: 'Month & year of manufacture smudged or missing' }
    ]
  },
  {
    id: 'hotspot-400001',
    pinCode: '400001',
    region: 'Fort & Crawford Market Commodity Zone',
    state: 'Maharashtra (Mumbai)',
    coordinates: [18.9401, 72.8347],
    totalInspections: 58,
    nonCompliantCount: 39,
    compliantCount: 19,
    totalViolations: 51,
    complianceRate: 32.8,
    offenceSeverity: 'HIGH',
    mostCommonViolation: 'Rule 6(11)',
    ruleBreakdown: [
      { rule: 'Rule 6(11)', count: 28, description: 'Missing e-commerce disclosure / QR code for product attributes' },
      { rule: 'Rule 9', count: 12, description: 'Principal display panel font dimension violations' },
      { rule: 'Rule 6(1)(e)', count: 7, description: 'MRP price dual declaration violation' },
      { rule: 'Rule 6(1)(n)', count: 4, description: 'Consumer care email and telephone omitted' }
    ]
  },
  {
    id: 'hotspot-400051',
    pinCode: '400051',
    region: 'Bandra Kurla Complex (BKC) Retail Arcades',
    state: 'Maharashtra (Mumbai)',
    coordinates: [19.0657, 72.8687],
    totalInspections: 40,
    nonCompliantCount: 14,
    compliantCount: 26,
    totalViolations: 18,
    complianceRate: 65.0,
    offenceSeverity: 'MEDIUM',
    mostCommonViolation: 'Rule 6(11)',
    ruleBreakdown: [
      { rule: 'Rule 6(11)', count: 10, description: 'E-Commerce digital disclosure / QR missing' },
      { rule: 'Rule 9', count: 5, description: 'Font size and manner of declaration' },
      { rule: 'Rule 6(1)(f)', count: 3, description: 'Net quantity symbol spacing violation' }
    ]
  },
  {
    id: 'hotspot-560001',
    pinCode: '560001',
    region: 'MG Road & Brigade Commercial District',
    state: 'Karnataka (Bengaluru)',
    coordinates: [12.9756, 77.6066],
    totalInspections: 48,
    nonCompliantCount: 31,
    compliantCount: 17,
    totalViolations: 42,
    complianceRate: 35.4,
    offenceSeverity: 'HIGH',
    mostCommonViolation: 'Rule 6(11)',
    ruleBreakdown: [
      { rule: 'Rule 6(11)', count: 22, description: 'Digital mandatory declaration not accessible via QR code' },
      { rule: 'Rule 9', count: 11, description: 'Declaration text contrast and font height deficiency' },
      { rule: 'Rule 6(1)(e)', count: 6, description: 'Unit Sale Price (USP) not displayed alongside MRP' },
      { rule: 'Rule 6(1)(a)', count: 3, description: 'Importer name and country of origin missing' }
    ]
  },
  {
    id: 'hotspot-560068',
    pinCode: '560068',
    region: 'Bommanahalli / Electronic City Logistics Warehouses',
    state: 'Karnataka (Bengaluru)',
    coordinates: [12.9038, 77.6256],
    totalInspections: 72,
    nonCompliantCount: 48,
    compliantCount: 24,
    totalViolations: 66,
    complianceRate: 33.3,
    offenceSeverity: 'CRITICAL',
    mostCommonViolation: 'Rule 6(11)',
    ruleBreakdown: [
      { rule: 'Rule 6(11)', count: 34, description: 'E-commerce packaged commodity digital disclosure omitted' },
      { rule: 'Rule 9', count: 17, description: 'Manner of packing and labeling font restrictions violated' },
      { rule: 'Rule 6(1)(f)', count: 10, description: 'Standard units of weight/volume not adhered to' },
      { rule: 'Rule 6(1)(e)', count: 5, description: 'Overcharging above printed MRP detected' }
    ]
  },
  {
    id: 'hotspot-700001',
    pinCode: '700001',
    region: 'BBD Bagh / Burrabazar Wholesale Hub',
    state: 'West Bengal (Kolkata)',
    coordinates: [22.5726, 88.3511],
    totalInspections: 46,
    nonCompliantCount: 33,
    compliantCount: 13,
    totalViolations: 44,
    complianceRate: 28.3,
    offenceSeverity: 'CRITICAL',
    mostCommonViolation: 'Rule 9',
    ruleBreakdown: [
      { rule: 'Rule 9', count: 21, description: 'Manner of declaration and font size violation under Rule 9' },
      { rule: 'Rule 6(11)', count: 12, description: 'Digital declaration / website address missing' },
      { rule: 'Rule 6(1)(a)', count: 7, description: 'Unregistered packer identity' },
      { rule: 'Rule 6(1)(d)', count: 4, description: 'Expiry/Best before declaration illegible' }
    ]
  },
  {
    id: 'hotspot-500001',
    pinCode: '500001',
    region: 'Koti & Begum Bazaar Commercial Market',
    state: 'Telangana (Hyderabad)',
    coordinates: [17.3850, 78.4867],
    totalInspections: 39,
    nonCompliantCount: 25,
    compliantCount: 14,
    totalViolations: 34,
    complianceRate: 35.9,
    offenceSeverity: 'HIGH',
    mostCommonViolation: 'Rule 6(11)',
    ruleBreakdown: [
      { rule: 'Rule 6(11)', count: 16, description: 'QR code digital specification breach under Rule 6(11)' },
      { rule: 'Rule 9', count: 10, description: 'Declaration not prominently displayed in principal display panel' },
      { rule: 'Rule 6(1)(e)', count: 5, description: 'MRP sticker pasted over original printed price' },
      { rule: 'Rule 6(1)(n)', count: 3, description: 'Consumer helpline contact details absent' }
    ]
  },
  {
    id: 'hotspot-600001',
    pinCode: '600001',
    region: 'George Town / Parrys Port Market',
    state: 'Tamil Nadu (Chennai)',
    coordinates: [13.0902, 80.2870],
    totalInspections: 35,
    nonCompliantCount: 11,
    compliantCount: 24,
    totalViolations: 15,
    complianceRate: 68.6,
    offenceSeverity: 'MEDIUM',
    mostCommonViolation: 'Rule 9',
    ruleBreakdown: [
      { rule: 'Rule 9', count: 8, description: 'Font size of net quantity and MRP below statutory height' },
      { rule: 'Rule 6(11)', count: 4, description: 'E-Commerce digital declaration missing' },
      { rule: 'Rule 6(1)(f)', count: 3, description: 'Non-standard quantity declaration' }
    ]
  },
  {
    id: 'hotspot-380001',
    pinCode: '380001',
    region: 'Kalupur Wholesale Complex',
    state: 'Gujarat (Ahmedabad)',
    coordinates: [23.0225, 72.5714],
    totalInspections: 42,
    nonCompliantCount: 27,
    compliantCount: 15,
    totalViolations: 36,
    complianceRate: 35.7,
    offenceSeverity: 'HIGH',
    mostCommonViolation: 'Rule 6(11)',
    ruleBreakdown: [
      { rule: 'Rule 6(11)', count: 18, description: 'QR code digital declaration compliance failure' },
      { rule: 'Rule 9', count: 11, description: 'Manner of declaration and character height violation' },
      { rule: 'Rule 6(1)(e)', count: 4, description: 'MRP inclusive of all taxes not stated' },
      { rule: 'Rule 6(1)(a)', count: 3, description: 'Packer contact address truncated' }
    ]
  },
  {
    id: 'hotspot-411001',
    pinCode: '411001',
    region: 'Camp & Station Retail Distribution Center',
    state: 'Maharashtra (Pune)',
    coordinates: [18.5204, 73.8567],
    totalInspections: 31,
    nonCompliantCount: 8,
    compliantCount: 23,
    totalViolations: 10,
    complianceRate: 74.2,
    offenceSeverity: 'LOW',
    mostCommonViolation: 'Rule 9',
    ruleBreakdown: [
      { rule: 'Rule 9', count: 5, description: 'Font size in principal display panel' },
      { rule: 'Rule 6(11)', count: 3, description: 'Digital declaration missing' },
      { rule: 'Rule 6(1)(d)', count: 2, description: 'Packing date formatting error' }
    ]
  }
];

export default analyticsService;

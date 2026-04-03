import mongoose, { Schema, Document } from 'mongoose';

export interface IIQProperty extends Document {
  name: string;
  actualName?: string;
  area?: string;
  locality?: string;
  nearbyLandmarks?: string;
  location?: string;
  price?: string;
  priceMin?: number;
  priceMax?: number;
  managerName?: string;
  managerContact?: string;
  ownerName?: string;
  ownerNumber?: string;
  groupName?: string;
  googleMapsLink?: string;
  gender?: string;
  targetAudience?: string;
  propertyType?: string;
  roomType?: string;
  furnishingDetails?: string;
  walkingDistance?: string;
  accessibility?: string;
  noiseLevel?: string;
  surroundingVibe?: string;
  foodType?: string;
  commonAreaFeatures?: string;
  amenities?: string;
  safetyFeatures?: string;
  mealsIncluded?: string;
  foodTimings?: string;
  eBillUtilities?: string;
  cleaningFrequency?: string;
  usp?: string;
  houseRules?: string;
  lows?: string;
  securityDeposit?: string;
  minimumStay?: string;
  brochureLink?: string;
  photosLink?: string;
  videosLink?: string;
  extractedPhotos?: string[];
  brochurePdf?: string;
  whatsappPromo?: string;
  zone?: string;
  subzone?: string;
  lat?: number;
  lng?: number;
  importedAt: Date;
}

const IQPropertySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    actualName: { type: String },
    area: { type: String },
    locality: { type: String },
    nearbyLandmarks: { type: String },
    location: { type: String },
    price: { type: String },
    priceMin: { type: Number },
    priceMax: { type: Number },
    managerName: { type: String },
    managerContact: { type: String },
    ownerName: { type: String },
    ownerNumber: { type: String },
    groupName: { type: String },
    googleMapsLink: { type: String },
    gender: { type: String },
    targetAudience: { type: String },
    propertyType: { type: String },
    roomType: { type: String },
    furnishingDetails: { type: String },
    walkingDistance: { type: String },
    accessibility: { type: String },
    noiseLevel: { type: String },
    surroundingVibe: { type: String },
    foodType: { type: String },
    commonAreaFeatures: { type: String },
    amenities: { type: String },
    safetyFeatures: { type: String },
    mealsIncluded: { type: String },
    foodTimings: { type: String },
    eBillUtilities: { type: String },
    cleaningFrequency: { type: String },
    usp: { type: String },
    houseRules: { type: String },
    lows: { type: String },
    securityDeposit: { type: String },
    minimumStay: { type: String },
    brochureLink: { type: String },
    photosLink: { type: String },
    videosLink: { type: String },
    extractedPhotos: { type: [String] },
    brochurePdf: { type: String },
    whatsappPromo: { type: String },
    zone: { type: String },
    subzone: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    importedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.IQProperty || mongoose.model<IIQProperty>('IQProperty', IQPropertySchema);

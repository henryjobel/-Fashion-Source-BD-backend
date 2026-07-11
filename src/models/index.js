import mongoose from "mongoose";

const { Schema } = mongoose;

const baseOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  },
};

const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "Super Admin" },
    role: { type: String, default: "super_admin" },
  },
  baseOptions,
);

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    intro: { type: String, default: "" },
    description: { type: String, default: "" },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    sort_order: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "draft"], default: "active" },
  },
  baseOptions,
);

const productSchema = new Schema(
  {
    category: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    short_name: { type: String, default: "" },
    description: { type: String, default: "" },
    image_url: { type: String, default: "" },
    specs: { type: [String], default: [] },
    status: { type: String, enum: ["active", "draft"], default: "active" },
    sort_order: { type: Number, default: 0 },
  },
  baseOptions,
);

const pageSectionSchema = new Schema(
  {
    section_key: { type: String, required: true },
    label: { type: String, required: true },
    section_type: { type: String, default: "content" },
    content: { type: Schema.Types.Mixed, default: {} },
    sort_order: { type: Number, default: 0 },
  },
  { _id: false },
);

const pageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    status: { type: String, enum: ["published", "draft"], default: "published" },
    seo_title: { type: String, default: "" },
    seo_description: { type: String, default: "" },
    sections: { type: [pageSectionSchema], default: [] },
  },
  baseOptions,
);

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, default: "" },
  },
  baseOptions,
);

const mediaSchema = new Schema(
  {
    public_id: { type: String, required: true },
    url: { type: String, default: "" },
    secure_url: { type: String, default: "" },
    resource_type: { type: String, default: "image" },
    folder: { type: String, default: "" },
    alt_text: { type: String, default: "" },
  },
  baseOptions,
);

const inquirySchema = new Schema(
  {
    type: { type: String, default: "contact" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    subject: { type: String, default: "" },
    message: { type: String, default: "" },
    status: { type: String, enum: ["open", "review", "closed", "archived"], default: "open" },
  },
  baseOptions,
);

const supplierSchema = new Schema(
  {
    company_name: { type: String, required: true },
    contact_person: { type: String, default: "" },
    email: { type: String, default: "" },
    website: { type: String, default: "" },
    country: { type: String, default: "" },
    monthly_capacity: { type: String, default: "" },
    service_details: { type: String, default: "" },
    profile_url: { type: String, default: "" },
    status: { type: String, enum: ["new", "review", "approved", "rejected"], default: "new" },
  },
  baseOptions,
);

const navigationItemSchema = new Schema(
  {
    location: { type: String, enum: ["header", "footer"], required: true },
    label: { type: String, required: true, trim: true },
    url: { type: String, default: "" },
    parent: { type: Schema.Types.ObjectId, ref: "NavigationItem", default: null },
    group: { type: String, default: "" },
    sort_order: { type: Number, default: 0 },
    target_blank: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "hidden"], default: "active" },
  },
  baseOptions,
);

export const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export const Page = mongoose.models.Page || mongoose.model("Page", pageSchema);
export const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);
export const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);
export const Inquiry = mongoose.models.Inquiry || mongoose.model("Inquiry", inquirySchema);
export const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema);
export const NavigationItem =
  mongoose.models.NavigationItem || mongoose.model("NavigationItem", navigationItemSchema);

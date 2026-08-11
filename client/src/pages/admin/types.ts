export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  isApproved: boolean;
  createdAt: string;
}

export interface AdminProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  originalPrice?: string | null;
  imageUrl: string;
  category: string;
  subcategory?: string;
  badge?: string;
  featured: boolean;
  newArrival: boolean;
  inStock: boolean;
  stockQuantity: number;
  approvalStatus: string;
  vendorId?: number;
}

export interface AdminOrder {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  total: string;
  createdAt: string;
  paymentStatus: string;
  shippingStatus: string;
  paymentProvider?: string | null;
  phone?: string | null;
}

export interface AdminFaq {
  id: number;
  question: string;
  answer: string;
  status: string;
  displayOrder: number;
  submittedBy?: number;
}

export interface AdminVisit {
  id: number;
  userName: string;
  userEmail: string;
  userRole: string;
  path: string;
  visitedAt: string;
}

export interface AdminSubscriber {
  id: number;
  email: string;
  subscribedAt: string;
  status: string;
}

export interface AdminAuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  ipAddress?: string;
  createdAt: string;
}

export interface AdminTeamMember {
  id: number;
  name: string;
  title: string;
  bio: string;
  imageUrl: string;
  displayOrder: number | null;
  isPublished: boolean;
  createdAt: string;
}

export interface AdminProductReview {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  title?: string | null;
  comment: string;
  status: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  productName?: string | null;
  userName?: string | null;
}

export interface SiteSetting {
  key: string;
  value: string;
}

export interface BannerData {
  text: string;
  bgColor?: string;
  isActive?: boolean;
}

export interface SiteContentData {
  content: string;
}

export interface CategoryOption {
  name: string;
  subcategories: string[];
}

export interface AdminProductFormProps {
  data: Record<string, unknown>;
  setData: (v: Record<string, unknown>) => void;
  categoryOptions?: CategoryOption[];
}

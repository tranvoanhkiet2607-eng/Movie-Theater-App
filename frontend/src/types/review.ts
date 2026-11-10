// UC40: Review Movies & UC41: Manage Reviews
export interface Review {
  id: string;
  movieId: string;
  movieTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  comment: string;
  likes?: number;
  status: 'approved' | 'hidden' | 'flagged';
  createdAt?: string;
  updatedAt?: string;
}

export interface MovieReviewsResponse {
  success: boolean;
  movieId: string;
  totalCount: number;
  averageRating: number;
  distribution: { [key: number]: number };
  reviews: Review[];
}

export interface ReviewMutationPayload {
  movieId: string;
  movieTitle?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  rating: number;
  comment: string;
}


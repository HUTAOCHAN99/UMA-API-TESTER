// Bentuk respons GET /api/v3/search (SearchResponse) sesuai dokumentasi uma.moe.
export type Inheritance = {
  inheritance_id?: number;
  account_id?: string;
  main_parent_id?: number;
  parent_left_id?: number;
  parent_right_id?: number;
  parent_rank?: number;
  parent_rarity?: number;
  blue_sparks?: number[];
  pink_sparks?: number[];
  green_sparks?: number[];
  white_sparks?: number[];
  win_count?: number;
  white_count?: number;
  main_blue_factors?: number;
  main_pink_factors?: number;
  main_green_factors?: number;
  main_white_factors?: number[];
  main_white_count?: number;
  affinity_score?: number;
};

export type SupportCard = {
  account_id?: string;
  support_card_id?: number;
  limit_break_count?: number;
  experience?: number;
};

export type SearchItem = {
  account_id?: string;
  trainer_name?: string;
  follower_num?: number;
  borrow_view_count?: number;
  borrow_copy_count?: number;
  last_updated?: string;
  inheritance?: Inheritance;
  support_card?: SupportCard;
};

export type SearchResponse = {
  items?: SearchItem[];
  total?: string; // angka sebagai string, atau "over 10000"
  page?: number;
  limit?: number;
  total_pages?: number;
};

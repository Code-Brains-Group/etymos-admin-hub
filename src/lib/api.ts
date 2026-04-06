// ─────────────────────────────────────────────────────────────
//  Etymos Admin Portal — Typed API Client
//  All 33 endpoints from the API spec
// ─────────────────────────────────────────────────────────────

// ── Types ──────────────────────────────────────────────────────

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  detail: string;
  message: string;
}

export interface PagedResponse<T> {
  items: T[];
  total_count: number;
  page: number;
  limit: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
  is_verified?: boolean;
  is_active: boolean;
  total_points?: number;
  quizzes_completed?: number;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface PlatformStats {
  total_users: number;
  active_users_today: number;
  total_quizzes_completed: number;
  total_words_searched: number;
  top_category: string;
  new_users_this_week: number;
  active_competitions: number;
}

export interface Activity {
  id: number;
  user_id: string;
  email: string;
  full_name: string;
  action_type: string;
  details: string;
  created_at: string;
}

export interface Category {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  is_active?: boolean;
  created_at?: string;
  word_count?: number;
}

export interface CategoryWords {
  category_id: number;
  words: string[];
  total: number;
  page: number;
  limit: number;
}

export interface SpecialQuiz {
  id: string;
  title: string;
  description: string;
  competition_title?: string;
  quiz_id?: string;
  category_id: number;
  num_questions?: number;
  num_rounds?: number;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  created_at?: string;
}

export interface SpecialQuizRound {
  seed_word: string;
  scrambled_letters: string;
  solutions: { word: string; points: number }[];
}

export interface SpecialQuizDetail extends SpecialQuiz {
  rounds: SpecialQuizRound[];
}

export interface Award {
  id: number;
  title: string;
  description: string;
  icon_url: string;
  points_required: number;
  competition_id?: string;
  competition_title?: string;
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  prize_details: string;
  is_active: boolean;
  is_processed: boolean;
  status?: "active" | "upcoming" | "past";
  participant_count?: number;
  created_at: string;
}

export interface CompetitionDetail extends Competition {
  quizzes: SpecialQuiz[];
  awards: Award[];
}

export interface CompetitionParticipant {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  score: number;
  joined_at: string;
}

export interface CompetitionLeaderboardEntry {
  id: string;
  competition_id: string;
  user_id: string;
  full_name: string;
  score: number;
  joined_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  quizzes_completed: number;
}

export interface LeaderboardData {
  results: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
}

// ── Analytics Types ─────────────────────────────────────
export interface TimeSeriesPoint { date: string; value: number; }

export interface AnalyticsData {
  user_growth: TimeSeriesPoint[];
  quizzes_over_time: TimeSeriesPoint[];
  quiz_difficulty_dist: { easy: number; medium: number; hard: number };
  quiz_status_dist: { in_progress: number; completed: number };
  activity_over_time: Record<string, TimeSeriesPoint[]>;
  activity_type_dist: Record<string, number>;
  competition_performance: { competition_id: string; title: string; participants: number; avg_score: number }[];
  top_words_searched: { word: string; count: number }[];
  word_searches_over_time: TimeSeriesPoint[];
}

// ── Client factory ─────────────────────────────────────────────

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

async function request<T>(
  baseUrl: string,
  path: string,
  method: RequestMethod,
  token?: string | null,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    // Required to bypass the ngrok landing page which often causes CORS/parsing issues in browsers
    "ngrok-skip-browser-warning": "true",
  };

  // Only set application/json if not using FormData
  const isFormData = body instanceof FormData;
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : (body !== undefined ? JSON.stringify(body) : undefined),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  if (!res.ok) {
    const err = json as ApiError;
    throw new Error(err?.message || `HTTP ${res.status}`);
  }

  return (json as ApiEnvelope<T>).data;
}

// ── API factory — call createApi(baseUrl, token) ────────────────

export function createApi(baseUrl: string, token?: string | null) {
  const r = <T>(path: string, method: RequestMethod, body?: unknown) =>
    request<T>(baseUrl, path, method, token, body);

  return {
    // ── Section 1: Auth ──────────────────────────────────────
    auth: {
      login: (email: string, password: string) =>
        r<LoginResponse>("/auth/login", "POST", { email, password }),

      register: (payload: {
        email: string;
        full_name: string;
        password: string;
        avatar_url?: string | null;
        bio?: string | null;
      }) => r<Record<string, never>>("/auth/register", "POST", payload),

      refresh: (refresh_token: string) =>
        r<LoginResponse>("/auth/refresh", "POST", { refresh_token }),

      logout: (refresh_token: string) =>
        r<Record<string, never>>("/auth/logout", "POST", { refresh_token }),
    },

    // ── Section 2: Admin — Users ─────────────────────────────
    admin: {
      getStats: () => r<PlatformStats>("/admin/stats", "GET"),

      getAnalytics: (params?: {
        start_date?: string;
        end_date?: string;
        granularity?: "day" | "week" | "month";
        category_id?: number;
        difficulty?: "easy" | "medium" | "hard";
        competition_id?: string;
      }) => {
        const q = new URLSearchParams();
        if (params?.start_date) q.set("start_date", params.start_date);
        if (params?.end_date) q.set("end_date", params.end_date);
        if (params?.granularity) q.set("granularity", params.granularity);
        if (params?.category_id) q.set("category_id", String(params.category_id));
        if (params?.difficulty) q.set("difficulty", params.difficulty);
        if (params?.competition_id) q.set("competition_id", params.competition_id);
        return r<AnalyticsData>(`/admin/analytics?${q.toString()}`, "GET");
      },

      getActivities: (userId?: string, page = 1, limit = 25, startDate?: string, endDate?: string) => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", String(limit));
        if (startDate) q.set("start_date", startDate);
        if (endDate) q.set("end_date", endDate);
        if (userId) q.set("user_id", userId);
        return r<PagedResponse<Activity>>(`/admin/activities?${q.toString()}`, "GET");
      },

      listUsers: (page = 1, limit = 25, search?: string) => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", String(limit));
        if (search) q.set("q", search);
        return r<PagedResponse<User>>(`/admin/users?${q.toString()}`, "GET");
      },
      getUser: (userId: string) =>
        r<User>(`/admin/users/${userId}`, "GET"),
      deleteUser: (userId: string) =>
        r<Record<string, never>>(`/admin/users/${userId}`, "DELETE"),

      banUser: (userId: string) =>
        r<Record<string, never>>(`/admin/users/${userId}/ban`, "PUT"),

      unbanUser: (userId: string) =>
        r<Record<string, never>>(`/admin/users/${userId}/unban`, "PUT"),

      makeAdmin: (userId: string) =>
        r<Record<string, never>>(`/admin/users/${userId}/make-admin`, "PUT"),
    },

    // ── Section 3: Admin — Categories ───────────────────────
    adminCategories: {
      list: (page = 1, limit = 25) => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", String(limit));
        return r<PagedResponse<Category>>(`/admin/categories?${q.toString()}`, "GET");
      },

      create: (payload: {
        title: string;
        description: string;
        image_url?: string | null;
      }) => r<Category>("/admin/categories", "POST", payload),

      update: (
        categoryId: number,
        payload: {
          title?: string;
          description?: string;
          image_url?: string | null;
          is_active?: boolean;
        }
      ) => r<Category>(`/admin/categories/${categoryId}`, "PUT", payload),

      delete: (categoryId: number) =>
        r<Record<string, never>>(`/admin/categories/${categoryId}`, "DELETE"),

      addWords: (categoryId: number, words: string[]) =>
        r<Record<string, never>>(
          `/admin/categories/${categoryId}/words`,
          "POST",
          { words }
        ),

      deleteWord: (categoryId: number, word: string) =>
        r<Record<string, never>>(
          `/admin/categories/${categoryId}/words/${encodeURIComponent(word)}`,
          "DELETE"
        ),
    },

    // ── Section 4: Admin — Special Quizzes ──────────────────
    adminQuizzes: {
      list: (page = 1, limit = 25) => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", String(limit));
        return r<PagedResponse<SpecialQuiz>>(`/admin/quizzes/special?${q.toString()}`, "GET");
      },

      create: (payload: {
        title: string;
        description?: string;
        competition_id: string;
        num_rounds: number;
        difficulty: "easy" | "medium" | "hard";
        category_id?: number;
        order_type?: "random" | "alphabetical";
        letter_count?: number;
        valid_from?: string;
        valid_until?: string;
        is_active?: boolean;
      }) => r<Record<string, never>>("/admin/quizzes/special", "POST", payload),

      update: (
        quizId: string,
        payload: {
          title?: string;
          description?: string;
          is_active?: boolean;
        }
      ) =>
        r<Record<string, never>>(
          `/admin/quizzes/special/${quizId}`,
          "PUT",
          payload
        ),

      delete: (quizId: string) =>
        r<Record<string, never>>(
          `/admin/quizzes/special/${quizId}`,
          "DELETE"
        ),

      getDetails: (quizId: string) =>
        r<SpecialQuizDetail>(`/admin/quizzes/special/${quizId}`, "GET"),
    },

    // ── Section 5: Admin — Awards ────────────────────────────
    adminAwards: {
      list: (page = 1, limit = 25) => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", String(limit));
        return r<PagedResponse<Award>>(`/admin/awards?${q.toString()}`, "GET");
      },
      create: (payload: {
        title: string;
        description: string;
        icon_url: string;
        points_required: number;
        competition_id?: string;
      }) => r<Record<string, never>>("/admin/awards", "POST", payload),

      update: (
        awardId: number,
        payload: {
          title?: string;
          description?: string;
          icon_url?: string;
          points_required?: number;
          competition_id?: string;
        }
      ) => r<Record<string, never>>(`/admin/awards/${awardId}`, "PUT", payload),

      delete: (awardId: number) =>
        r<Record<string, never>>(`/admin/awards/${awardId}`, "DELETE"),

      grant: (payload: { award_id: number; user_id: string; reason: string }) =>
        r<Record<string, never>>("/admin/awards/grant", "POST", payload),
      
      processCompleted: () =>
        r<{ processed_count: number }>("/admin/awards/process-completed", "POST"),

      listRecent: (page = 1, limit = 10) => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", String(limit));
        return r<PagedResponse<{
          id: string;
          award_title: string;
          full_name: string;
          email: string;
          granted_at: string;
          reason: string;
        }>>(`/admin/awards/recent?${q.toString()}`, "GET");
      },
    },

    // ── Section 6: Admin — Competitions ─────────────────────
    adminCompetitions: {
      list: (page = 1, limit = 25, status?: string) => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", String(limit));
        if (status) q.set("status", status);
        return r<PagedResponse<Competition>>(`/admin/competitions?${q.toString()}`, "GET");
      },
      create: (payload: {
        title: string;
        description: string;
        start_date: string;
        end_date: string;
        prize_details?: string;
      }) => r<Record<string, never>>("/admin/competitions", "POST", payload),

      update: (
        competitionId: string,
        payload: {
          title?: string;
          description?: string;
          end_date?: string;
          prize_details?: string;
        }
      ) =>
        r<Record<string, never>>(
          `/admin/competitions/${competitionId}`,
          "PUT",
          payload
        ),

      delete: (competitionId: string) =>
        r<Record<string, never>>(
          `/admin/competitions/${competitionId}`,
          "DELETE"
        ),

      announceWinners: (competitionId: string) =>
        r<Record<string, never>>(
          `/admin/competitions/${competitionId}/announce-winners`,
          "POST"
        ),

      getParticipants: (competitionId: string, page = 1, limit = 25) => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", String(limit));
        return r<PagedResponse<CompetitionParticipant>>(`/admin/competitions/${competitionId}/participants?${q.toString()}`, "GET");
      }
    },

    // ── Section 7: Public Read Endpoints ─────────────────────
    public: {
      getCategories: () => r<Category[]>("/categories/", "GET"),

      getCategory: (categoryId: number) =>
        r<Category>(`/categories/${categoryId}`, "GET"),

      getCategoryWords: (categoryId: number, page = 1, limit = 20) =>
        r<CategoryWords>(
          `/categories/${categoryId}/words?page=${page}&limit=${limit}`,
          "GET"
        ),

      getCompetitions: () => r<Competition[]>("/competitions/", "GET"),

      getCompetition: (competitionId: string) =>
        r<CompetitionDetail>(`/competitions/${competitionId}`, "GET"),

      getCompetitionLeaderboard: (competitionId: string) =>
        r<CompetitionLeaderboardEntry[]>(
          `/competitions/${competitionId}/leaderboard`,
          "GET"
        ),

      getGlobalLeaderboard: (params: {
        filter?: "alltime" | "weekly" | "monthly";
        category_id?: number;
        sort?: "points" | "time";
        page?: number;
        limit?: number;
      }) => {
        const q = new URLSearchParams();
        if (params.filter) q.set("filter", params.filter);
        if (params.category_id)
          q.set("category_id", String(params.category_id));
        if (params.sort) q.set("sort", params.sort);
        if (params.page) q.set("page", String(params.page));
        if (params.limit) q.set("limit", String(params.limit));
        return r<LeaderboardData>(`/leaderboard/?${q.toString()}`, "GET");
      },

      getAwards: () => r<Award[]>("/awards/", "GET"),
    },
  };
}

export type ApiClient = ReturnType<typeof createApi>;

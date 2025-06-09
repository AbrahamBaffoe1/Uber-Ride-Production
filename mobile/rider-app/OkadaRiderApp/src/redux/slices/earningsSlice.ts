// src/redux/slices/earningsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EarningsSummary {
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  availableBalance: number;
  totalRides: number;
  totalHours: number;
}

interface EarningsHistory {
  id: string;
  date: string;
  amount: number;
  rides: number;
}

interface EarningsState {
  summary: EarningsSummary | null;
  history: EarningsHistory[];
  isLoading: boolean;
  error: string | null;
}

const initialState: EarningsState = {
  summary: null,
  history: [],
  isLoading: false,
  error: null,
};

const earningsSlice = createSlice({
  name: 'earnings',
  initialState,
  reducers: {
    setEarningsSummary: (state, action: PayloadAction<EarningsSummary>) => {
      state.summary = action.payload;
    },
    setEarningsHistory: (state, action: PayloadAction<EarningsHistory[]>) => {
      state.history = action.payload;
    },
    updateAvailableBalance: (state, action: PayloadAction<number>) => {
      if (state.summary) {
        state.summary.availableBalance = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setEarningsSummary,
  setEarningsHistory,
  updateAvailableBalance,
  setLoading,
  setError,
} = earningsSlice.actions;
export default earningsSlice.reducer;

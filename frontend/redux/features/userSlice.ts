import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  isAuthenticated: boolean;
  email: string | null;
  name: string | null;
  isEmailVerified: boolean;
}

const initialState: UserState = {
  isAuthenticated: false,
  email: null,
  name: null,
  isEmailVerified: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Partial<UserState>>) => {
      const { email, name, isEmailVerified } = action.payload;
      if (email) {
        state.email = email
      };
      if (name) {
        state.name = name
      };
      if (isEmailVerified !== undefined) {
        state.isEmailVerified = isEmailVerified
      };
      state.isAuthenticated = true;
    },
    clearUser: (state) => {
      state.isAuthenticated = false;
      state.email = null;
      state.name = null;
      state.isEmailVerified = false;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;

export default userSlice.reducer; 
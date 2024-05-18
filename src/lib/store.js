import { configureStore } from '@reduxjs/toolkit'

import { combineReducers } from 'redux'
import { baseSlice } from '@/lib/slices/baseSlice'

const rootReducers = combineReducers({
    [baseSlice.name]: baseSlice.reducer
})

export const makeStore = () => {
  return configureStore({
    reducer: rootReducers,
    devTools: false,
    middleware: () => []
  })
}
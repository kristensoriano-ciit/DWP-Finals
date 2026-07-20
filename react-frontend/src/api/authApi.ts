import { request } from './http'
import type { AuthResponse, ChangePasswordRequest, LoginRequest, RegisterRequest, UpdateProfileRequest, User } from './types'
import { isAuthResponse, isEmptyResponse, isUser } from './responseValidation'

export function register(input: RegisterRequest) {
  return request<User>('/api/auth/register', { method: 'POST', body: input }, isUser)
}

export function login(input: LoginRequest) {
  return request<AuthResponse>('/api/auth/login', { method: 'POST', body: input }, isAuthResponse)
}

export function getCurrentProfile(token: string, onUnauthorized?: () => void) {
  return request<User>('/api/account/me', { method: 'GET', token, onUnauthorized }, isUser)
}

export function updateProfile(input: UpdateProfileRequest, token: string, onUnauthorized?: () => void) {
  return request<User>('/api/account/me', { method: 'PUT', body: input, token, onUnauthorized }, isUser)
}

export function changePassword(input: ChangePasswordRequest, token: string, onUnauthorized?: () => void) {
  return request<void>('/api/account/password', { method: 'PUT', body: input, token, onUnauthorized }, isEmptyResponse)
}

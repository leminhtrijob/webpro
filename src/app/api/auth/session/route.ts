import { AuthController } from '@/controllers/AuthController';

export async function GET(request: Request) {
  return AuthController.getSession(request);
}

export async function DELETE() {
  return AuthController.logout();
}

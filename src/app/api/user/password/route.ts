import { UserController } from '@/controllers/UserController';

export async function PATCH(request: Request) {
  return UserController.changePassword(request);
}

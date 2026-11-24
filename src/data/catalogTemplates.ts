import type { TemplateItem } from '@/models/gift';
import { AVAILABLE_TEMPLATES } from './availableTemplates';

/**
 * Toàn bộ danh mục trên TriKun Love Studio đều là các mẫu hoạt động 100% tại Local.
 * Không còn bất kỳ card "Nguồn tham khảo" hay link 404 nào.
 */
export const CATALOG_TEMPLATES: TemplateItem[] = AVAILABLE_TEMPLATES;

import type { Classification } from '../domain/types';
import { CLASSIFICATION_LABEL, CLASSIFICATION_TONE, TONE_BADGE } from './records';

export function ClassificationBadge({ classification }: { classification: Classification }) {
  const tone = CLASSIFICATION_TONE[classification];
  return (
    <span
      title={classification}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${TONE_BADGE[tone]}`}
    >
      {CLASSIFICATION_LABEL[classification]}
    </span>
  );
}

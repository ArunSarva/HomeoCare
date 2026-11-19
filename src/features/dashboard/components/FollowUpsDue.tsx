import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Skeleton, type Color } from 'react-typescript-ui';
import { BellRing, ChevronRight, MessageCircle, Phone } from 'lucide-react';
import type { FollowUp } from '../../../types';
import { EmptyState } from '../../../components/ui/EmptyState';
import { daysFromToday, formatDate, whatsappLink } from './format';

interface FollowUpsDueProps {
  followUps: FollowUp[];
  contacts: Map<string, { mobile: string; whatsapp?: string }>;
  loading: boolean;
}

function dueLabel(nextReview: string): { text: string; color: Color } {
  const days = daysFromToday(nextReview);
  if (days < 0) return { text: `Overdue ${-days}d`, color: 'danger' };
  if (days === 0) return { text: 'Due today', color: 'warning' };
  if (days === 1) return { text: 'Tomorrow', color: 'warning' };
  return { text: `In ${days} days`, color: 'neutral' };
}

const iconButtonClass =
  'focus-ring w-8 h-8 shrink-0 rounded-md border border-border flex items-center justify-center text-muted hover:bg-surface-2 hover:text-text';

export function FollowUpsDue({ followUps, contacts, loading }: FollowUpsDueProps) {
  const navigate = useNavigate();

  return (
    <Card padding="md" className="shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text">Follow-ups due</h2>
        <Button variant="ghost" color="neutral" size="sm" onClick={() => navigate('/followups')} rightIcon={<ChevronRight size={16} />}>
          All
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <Skeleton key={i} variant="rect" height={48} />
          ))}
        </div>
      ) : followUps.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="Nothing due"
          description="No follow-up reviews are due in the next 3 days."
          minHeight={160}
        />
      ) : (
        <ul className="divide-y divide-border">
          {followUps.map(fu => {
            const due = dueLabel(fu.nextReview!);
            const contact = contacts.get(fu.patientId);
            const whatsapp = contact?.whatsapp || contact?.mobile;
            return (
              <li key={fu.id} className="flex items-center gap-2 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{fu.patientName}</p>
                  <p className="text-xs text-muted">{formatDate(fu.nextReview!)}</p>
                </div>
                <Badge color={due.color} variant="soft" size="sm">
                  {due.text}
                </Badge>
                {contact?.mobile && (
                  <a href={`tel:${contact.mobile}`} className={iconButtonClass} aria-label={`Call ${fu.patientName}`}>
                    <Phone size={15} aria-hidden="true" />
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={whatsappLink(whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={iconButtonClass}
                    aria-label={`WhatsApp ${fu.patientName}`}
                  >
                    <MessageCircle size={15} aria-hidden="true" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default FollowUpsDue;

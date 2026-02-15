export interface Member { id: string; name: string; }
export interface Participant { id: string; member_id: string; member_name: string; is_paid: boolean; }
export interface Transaction { 
  id: string; payer_id: string; payer_name: string; 
  description: string; amount: number; date: string; 
  participants: Participant[]; 
}
export interface Group { id: string; name: string; members: Member[]; }
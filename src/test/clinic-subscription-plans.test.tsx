import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ClinicSubscriptionPlans from '@/components/dashboard/ClinicSubscriptionPlans';
import { CLINIC_SMALL, CLINIC_MEDIUM, CLINIC_LARGE } from '@/constants/clinicPricing';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), refetch: vi.fn(), manager: true }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/contexts/ClinicContext', () => ({ useClinic: () => ({ activeClinic: { clinic_id: 'clinic-a', clinic_name: 'Clinic A' }, isClinicOwner: mocks.manager, refetch: mocks.refetch }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'pt', t: (key: string) => key }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.manager = true; });
describe('clinic inline checkout', () => {
  it('sends annual plan with the selected clinic and dashboard return context', async () => {
    mocks.invoke.mockResolvedValue({ data: { already_active: true } });
    render(<ClinicSubscriptionPlans />);
    fireEvent.click(screen.getByRole('button', {name: 'Assinar Essencial'}));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('create-clinic-subscription', {body: {tier:'small',plan:'annual',clinic_id:'clinic-a',clinic_name:'Clinic A',source:'dashboard'}}));
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));
  });
  it('uses monthly selection for checkout', async () => {
    mocks.invoke.mockResolvedValue({ data: { already_active: true } });
    render(<ClinicSubscriptionPlans />);
    fireEvent.click(screen.getByRole('radio', {name:'Mensal'}));
    fireEvent.click(screen.getByRole('button', {name:'Assinar Profissional'}));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('create-clinic-subscription', {body: {tier:'medium',plan:'monthly',clinic_id:'clinic-a',clinic_name:'Clinic A',source:'dashboard'}}));
  });
  it('does not allow a non-manager to initiate payment', () => {
    mocks.manager=false;
    const {container}=render(<ClinicSubscriptionPlans />);
    expect(container.childElementCount).toBe(0);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('permits retry after checkout failure without leaving the app', async () => {
    mocks.invoke.mockResolvedValue({error:new Error('network')});
    render(<ClinicSubscriptionPlans />);
    fireEvent.click(screen.getByRole('button',{name:'Assinar Enterprise'}));
    await waitFor(() => expect(screen.getByRole('button',{name:'Assinar Enterprise'}).hasAttribute('disabled')).toBe(false));
    mocks.invoke.mockResolvedValue({data:{already_active:true}});
    fireEvent.click(screen.getByRole('button',{name:'Assinar Enterprise'}));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(2));
  });
  it('keeps all six displayed price IDs aligned with the server allowlist', () => {
    const server=readFileSync('supabase/functions/create-clinic-subscription/index.ts','utf8');
    for (const [tier,data] of [['small',CLINIC_SMALL],['medium',CLINIC_MEDIUM],['large',CLINIC_LARGE]] as const) {
      for (const period of ['monthly','annual'] as const) {
        expect(server.match(new RegExp(`"${tier}_${period}": "([^"]+)"`))?.[1]).toBe(data[period].price_id);
      }
    }
    expect(CLINIC_SMALL.monthly.price).toBe(197);
    expect(CLINIC_SMALL.annual.total).toBe(1344);
  });
});
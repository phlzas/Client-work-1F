import { useState, useEffect } from "react";
import { ApiService } from "@/lib/api";

interface PaymentSettings {
  id: number;
  one_time_amount: number;
  monthly_amount: number;
  installment_amount: number;
  installment_interval_months: number;
  reminder_days: number;
  payment_threshold: number;
  updated_at: string;
}

export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const settingsData = await ApiService.getPaymentSettings();
      setSettings(settingsData);
    } catch (err) {
      console.error("Failed to load payment settings:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load payment settings"
      );
      // Fallback to default settings if API fails
      setSettings({
        id: 1,
        one_time_amount: 6000,
        monthly_amount: 850,
        installment_amount: 2850,
        installment_interval_months: 3,
        reminder_days: 7,
        payment_threshold: 6000,
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = async (newSettings: {
    one_time_amount: number;
    monthly_amount: number;
    installment_amount: number;
    installment_interval_months: number;
    reminder_days: number;
    payment_threshold: number;
  }): Promise<void> => {
    await ApiService.updatePaymentSettings(newSettings);
    await loadSettings(); // Refresh the settings
  };

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings,
  };
}

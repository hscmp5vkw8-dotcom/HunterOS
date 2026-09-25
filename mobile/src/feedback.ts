import { Linking, Platform, Share } from 'react-native';
import Constants from 'expo-constants';

export const appVersion = Constants.expoConfig?.version ?? '0.4.0';
export const supportEmail = 'support@gethunteros.com';
export async function emailFeedback(message: string) {
  await Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent(`HunterOS ${appVersion} feedback`)}&body=${encodeURIComponent(message)}`);
}
export async function shareFeedback(message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof navigator.share === 'function') {
      await navigator.share({title:'HunterOS feedback',text:message});
      return true;
    }
    await navigator.clipboard.writeText(message);
    return true;
  }
  const result = await Share.share({title:'HunterOS feedback',message});
  return result.action === Share.sharedAction;
}

export function feedbackReport(kind:string, details:string, steps:string, expected:string) {
  return [
    `HunterOS ${appVersion} — family beta feedback`,
    `Device: ${Platform.OS} ${Platform.Version ?? ''}`.trim(),
    `Type: ${kind}`,
    '', details.trim(),
    ...(steps.trim() ? ['', 'Steps to reproduce:', steps.trim()] : []),
    ...(expected.trim() ? ['', 'What I expected:', expected.trim()] : []),
  ].join('\n');
}

import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useModoTema } from '../tema';

export default function RootLayout() {
  const modo = useModoTema();
  return (
    <>
      <StatusBar style={modo === 'escuro' ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}
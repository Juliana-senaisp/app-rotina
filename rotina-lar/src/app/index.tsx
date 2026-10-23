import { View, ActivityIndicator } from 'react-native';
import { useUsuario } from '../auth';
import Login from '../Login';
import Principal from '../Principal';
import { useTema } from '../tema';

export default function Index() {
  const c = useTema();
  const { usuario, carregando } = useUsuario();

  if (carregando) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fundo }}
      >
        <ActivityIndicator color={c.primaria} />
      </View>
    );
  }

  return usuario ? <Principal /> : <Login />;
}
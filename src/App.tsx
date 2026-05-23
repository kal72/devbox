import { useHashRoute } from './hooks/useHashRoute';
import { Layout } from './components/layout/Layout';
import { JsonFormatter } from './components/tools/JsonFormatter';
import { JsonToTable } from './components/tools/JsonToTable';
import { UuidGenerator } from './components/tools/UuidGenerator';
import { JwtTool } from './components/tools/JwtTool';

function App() {
  const currentRoute = useHashRoute('formatter');

  return (
    <Layout currentRoute={currentRoute}>
      {currentRoute === 'formatter' && <JsonFormatter />}
      {currentRoute === 'table' && <JsonToTable />}
      {currentRoute === 'uuid' && <UuidGenerator />}
      {currentRoute === 'jwt' && <JwtTool />}
    </Layout>
  );
}

export default App;

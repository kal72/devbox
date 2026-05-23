import { useHashRoute } from './hooks/useHashRoute';
import { Layout } from './components/layout/Layout';
import { JsonFormatter } from './components/tools/JsonFormatter';
import { JsonToTable } from './components/tools/JsonToTable';
import { UuidGenerator } from './components/tools/UuidGenerator';
import { JwtTool } from './components/tools/JwtTool';
import { SqlTool } from './components/tools/SqlTool';
import { HashGenerator } from './components/tools/HashGenerator';

function App() {
  const currentRoute = useHashRoute('formatter');

  return (
    <Layout currentRoute={currentRoute}>
      {currentRoute === 'formatter' && <JsonFormatter />}
      {currentRoute === 'table' && <JsonToTable />}
      {currentRoute === 'uuid' && <UuidGenerator />}
      {currentRoute === 'jwt' && <JwtTool />}
      {currentRoute === 'sql' && <SqlTool />}
      {currentRoute === 'hash' && <HashGenerator />}
    </Layout>
  );
}

export default App;

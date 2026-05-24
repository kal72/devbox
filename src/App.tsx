import { useHashRoute } from './hooks/useHashRoute';
import { Layout } from './components/layout/Layout';
import { JsonFormatter } from './components/tools/JsonFormatter';
import { JsonToTable } from './components/tools/JsonToTable';
import { UuidGenerator } from './components/tools/UuidGenerator';
import { JwtTool } from './components/tools/JwtTool';
import { SqlTool } from './components/tools/SqlTool';
import { HashGenerator } from './components/tools/HashGenerator';
import { EncryptTool } from './components/tools/EncryptTool';
import { Base64Tool } from './components/tools/Base64Tool';
import { SqlGormTool } from './components/tools/SqlGormTool';

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
      {currentRoute === 'encrypt' && <EncryptTool />}
      {currentRoute === 'base64' && <Base64Tool />}
      {currentRoute === 'sql-gorm' && <SqlGormTool />}
    </Layout>
  );
}

export default App;

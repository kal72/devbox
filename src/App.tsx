import { useHashRoute } from './hooks/useHashRoute';
import { Layout } from './components/layout/Layout';
import { JsonFormatter } from './components/tools/JsonFormatter';
import { JsonToTable } from './components/tools/JsonToTable';

function App() {
  const currentRoute = useHashRoute('formatter');

  return (
    <Layout currentRoute={currentRoute}>
      {currentRoute === 'formatter' && <JsonFormatter />}
      {currentRoute === 'table' && <JsonToTable />}
    </Layout>
  );
}

export default App;

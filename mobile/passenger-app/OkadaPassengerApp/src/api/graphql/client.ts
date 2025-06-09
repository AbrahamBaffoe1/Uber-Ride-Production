import { ApolloClient, InMemoryCache, createHttpLink, split, NormalizedCacheObject } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../../config/index';

// HTTP connection to the API
const httpLink = createHttpLink({
  uri: Config.GRAPHQL_URL,
});

// WebSocket connection for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: Config.WEBSOCKET_URL,
    connectionParams: async () => {
      const token = await AsyncStorage.getItem('authToken');
      return {
        Authorization: token ? `Bearer ${token}` : '',
      };
    },
  })
);

// Authentication link to add token to requests
const authLink = setContext(async (_, { headers }: { headers?: Record<string, string> }) => {
  // Get the authentication token from storage
  const token = await AsyncStorage.getItem('authToken');
  
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Split link based on operation (query/mutation vs subscription)
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

// Create the Apollo Client
const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: Config.ENV !== 'production',
});

export default client;

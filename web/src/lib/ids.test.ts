import { parseAccountId } from './ids';

test.each([
  ['76561198000000000', '39734272'],
  ['https://steamcommunity.com/profiles/76561198000000000/', '39734272'],
  ['https://www.opendota.com/players/123456789', '123456789'],
  ['  39734272 ', '39734272'],
])('parseAccountId(%s)', (input, out) => expect(parseAccountId(input)).toBe(out));

test.each(['12345', 'abc', '', 'https://steamcommunity.com/id/somename'])('rejects %s', (i) =>
  expect(parseAccountId(i)).toBeNull());

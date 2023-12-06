const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const CreateThread = require('../../../Domains/threads/entities/CreateThread');
const CreatedThread = require('../../../Domains/threads/entities/CreatedThread');
const pool = require('../../database/postgres/pool');
const ThreadRepositoryPostgres = require('../ThreadRepositoryPostgres');

describe('ThreadRepositoryPostgres', () => {
  afterEach(async () => {
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('addThread function', () => {
    it('should persist create thread and return created thread correctly', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({
        username: 'dicoding',
        password: 'secret_password',
        id: 'user-123',
      });

      const createThread = new CreateThread({
        title: 'A Title',
        body: 'A Body',
        owner: 'user-123',
      });
      const fakeIdGenerator = () => '123'; // stub!
      const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, fakeIdGenerator);

      // Action
      const createdThread = await threadRepositoryPostgres.addThread(createThread);

      // Assert
      const threads = await ThreadsTableTestHelper.findThreadsById(createdThread.id);
      expect(threads).toHaveLength(1);
      expect(createdThread).toStrictEqual(new CreatedThread({
        id: 'thread-123',
        title: 'A Title',
        owner: 'user-123',
      }));
    });
  });
});

const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const CreateComment = require('../../../Domains/comments/entities/CreateComment');
const CreatedComment = require('../../../Domains/comments/entities/CreatedComment');
const pool = require('../../database/postgres/pool');
const CommentRepositoryPostgres = require('../CommentRepositoryPostgres');
const NotFoundError = require('../../../Commons/exceptions/NotFoundError');
const AuthorizationError = require('../../../Commons/exceptions/AuthorizationError');

describe('CommentRepositoryPostgres', () => {
  afterEach(async () => {
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('addComment function', () => {
    it('should persist create comment and return created command correctly', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-123' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-123' });

      const createComment = new CreateComment({
        content: 'A Comment',
        thread: 'thread-123',
        owner: 'user-123',
      });
      const fakeIdGenerator = () => '123'; // stub!
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, fakeIdGenerator);

      // Action
      const createdComment = await commentRepositoryPostgres.addComment(createComment);

      // Assert
      const comment = await CommentsTableTestHelper.findCommentsById(createdComment.id);
      expect(comment).toHaveLength(1);
      expect(createdComment).toStrictEqual(new CreatedComment({
        id: 'comment-123',
        content: 'A Comment',
        owner: 'user-123',
      }));
    });
  });

  describe('verifyCommentIsExist function', () => {
    it('should throw NotFoundError when comment not exist', () => {
      // Arrange
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

      // Action & Assert
      return expect(commentRepositoryPostgres.verifyCommentIsExist('xxx'))
        .rejects
        .toThrowError(NotFoundError);
    });

    it('should not throw NotFoundError when comment is exist', async () => {
      // Arrange
      const commentId = 'comment-123';
      await UsersTableTestHelper.addUser({ id: 'user-123' }); // add user with id user-123

      await ThreadsTableTestHelper.addThread({ id: 'thread-123' }); // add thread with id thread-123
      await CommentsTableTestHelper.addComment({ id: commentId });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

      // Action & Assert
      return expect(commentRepositoryPostgres.verifyCommentIsExist(commentId))
        .resolves.not.toThrowError(NotFoundError);
    });
  });

  describe('verifyCommentOwner function', () => {
    it('should throw UnauthorizedError when provided userId is not the comment owner', async () => {
      // Arrange
      const commentId = 'comment-123';
      const userId = 'user-123';
      const wrongUserId = 'user-456';
      await UsersTableTestHelper.addUser({ id: userId }); // add user with id user-123
      await ThreadsTableTestHelper.addThread({ id: 'thread-123' }); // add thread with id thread-123
      await CommentsTableTestHelper.addComment({ id: commentId });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

      // Action & Assert
      expect(commentRepositoryPostgres.verifyCommentOwner(commentId, wrongUserId))
        .rejects.toThrowError(AuthorizationError);
    });

    it('should verify the comment owner correctly', async () => {
      // Arrange
      const commentId = 'comment-123';
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      await ThreadsTableTestHelper.addThread({ id: 'thread-123' });
      await CommentsTableTestHelper.addComment({ id: commentId, owner: userId });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});
      // Action & Assert
      expect(commentRepositoryPostgres.verifyCommentOwner(commentId, userId))
        .resolves.not.toThrowError(AuthorizationError);
    });
  });

  describe('deleteComment function', () => {
    it('should throw NotFoundError when comment not found', () => {
      // Arrange
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

      // Action & Assert
      return expect(commentRepositoryPostgres.deleteComment('xxx'))
        .rejects
        .toThrowError(NotFoundError);
    });

    it('should delete comment by id and return success correctly', async () => {
      // Arrange
      const commentId = 'comment-123';
      await UsersTableTestHelper.addUser({ id: 'user-123' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-123' });
      await CommentsTableTestHelper.addComment({ id: commentId });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

      // Action
      await commentRepositoryPostgres.deleteComment(commentId);

      // Assert
      const comments = await CommentsTableTestHelper.findCommentsById(commentId);
      expect(comments).toHaveLength(1);
      expect(comments[0].is_delete).toEqual(true);
    });
  });
});

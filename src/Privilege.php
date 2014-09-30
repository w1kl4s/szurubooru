<?php
namespace Szurubooru;

class Privilege
{
	const REGISTER = 'register';
	const LIST_USERS = 'listUsers';
	const VIEW_ALL_EMAIL_ADDRESSES = 'viewAllEmailAddresses';
	const CHANGE_ACCESS_RANK = 'changeAccessRank';
	const CHANGE_OWN_AVATAR_STYLE = 'changeOwnAvatarStyle';
	const CHANGE_OWN_EMAIL_ADDRESS = 'changeOwnEmailAddress';
	const CHANGE_OWN_NAME = 'changeOwnName';
	const CHANGE_OWN_PASSWORD = 'changeOwnPassword';
	const CHANGE_ALL_AVATAR_STYLES = 'changeAllAvatarStyles';
	const CHANGE_ALL_EMAIL_ADDRESSES = 'changeAllEmailAddresses';
	const CHANGE_ALL_NAMES = 'changeAllNames';
	const CHANGE_ALL_PASSWORDS = 'changeAllPasswords';
	const DELETE_OWN_ACCOUNT = 'deleteOwnAccount';
	const DELETE_ALL_ACCOUNTS = 'deleteAllAccounts';
	const BAN = 'ban';

	const LIST_SAFE_POSTS = 'listSafePosts';
	const LIST_SKETCHY_POSTS = 'listSketchyPosts';
	const LIST_UNSAFE_POSTS = 'listUnsafePosts';
	const UPLOAD_POSTS = 'uploadPosts';
	const UPLOAD_POSTS_ANONYMOUSLY = 'uploadPostsAnonymously';
	const DELETE_POSTS = 'deletePosts';
	const FEATURE_POSTS = 'featurePosts';
	const CHANGE_POST_SAFETY = 'changePostSafety';
	const CHANGE_POST_SOURCE = 'changePostSource';
	const CHANGE_POST_TAGS = 'changePostTags';
	const CHANGE_POST_CONTENT = 'changePostContent';
	const CHANGE_POST_THUMBNAIL = 'changePostThumbnail';
	const CHANGE_POST_RELATIONS = 'changePostRelations';

	const LIST_TAGS = 'listTags';

	const VIEW_HISTORY = 'viewHistory';
}

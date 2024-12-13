// bean/EnrichedComment.js
class EnrichedComment {
    constructor(comment, user) {
        this.id = comment._id;
        this.id_user = user._id;
        this.email = user.email;
        this.name = user.name;
        this.image = user.image;
        this.star = comment.star;
        this.content = comment.content;
        this.time = comment.time;
    }
}

module.exports = EnrichedComment;

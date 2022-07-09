/**
 * Class providing a name space for inbox import functions.
 */
class InboxImporter {

	/**
	 * Imports items from inbox sent to special email address (e.g. max+todo@example.com).
   * Calls given handler with the title of each item to be imported.
	 */
	static importFromInbox(handler) {
		
		// Query threads with emails sent to suffixed address
		const suffixed_address = this.getSuffixedEmailAddress();
		const query = `in:inbox to:${suffixed_address}`;
		const threads = GmailApp.search(query);

		for (const thread of threads) {

			// Skip if thread has multiple messages
			if (thread.getMessageCount() != 1) {
				continue;
			}
			
			// Skip if already archived (should not happen given query)
			if (!thread.isInInbox()) {
				continue;
			}

			// Extract subject
			const subject = thread.getFirstMessageSubject();
			if (subject == null || subject.length == 0) {
				continue;
			}
			
			// Process item
			handler(subject);

			// Archive and mark as read
			thread.moveToArchive();
			thread.markRead();
		}
	}


	/**
	 * Returns special, suffixed email address (e.g. max+todo@example.com).
	 */
	static getSuffixedEmailAddress() {

		const regex = /^(?<user>.+)@(?<domain>.+)$/;
		const match = InboxImporterConfig.EMAIL_ADDRESS.match(regex);
		if (match == null) {
			throw new Error(`Import was configured with an invalid email address: ${InboxImporterConfig.EMAIL_ADDRESS}`);
		}
		const user = match.groups.user;
		const domain = match.groups.domain;
		return `${user}+${InboxImporterConfig.EMAIL_SUFFIX}@${domain}`;
	}
}
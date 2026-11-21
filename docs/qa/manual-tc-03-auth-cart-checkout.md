# Part 3 - Scosha auth, cart, COD checkout, account, wishlist

| ID | Area | Case | Preconditions | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CART-0001 | Cart | Guest cart persist | Guest/customer | Add; F5 | Kept |  |
| CART-0002 | Cart | Multi items | Guest/customer | Add 3 | 3 lines |  |
| CART-0003 | Cart | Stock cap | Guest/customer | Exceed | Blocked |  |
| CART-0004 | Cart | Failed add UX | Guest/customer | OOS | Error; no fake success |  |
| CART-0005 | Cart | Clear cart if UI | Guest/customer | Clear all | Empty |  |
| CART-0006 | Cart | Qty edit drawer | Guest/customer | Change qty | PATCH cart |  |
| CART-0007 | Cart | Subtotal after remove | Guest/customer | Remove one of two | Recalculates |  |
| CART-0008 | Cart | Free ship threshold edge | Guest/customer | Just under $150 | Shows remaining |  |
| CART-0009 | Cart | Free ship at $150 | Guest/customer | At/over $150 | FREE shipping |  |
| CART-0010 | Cart | Cart empty after last remove | Guest/customer | Remove last | Empty CTAs |  |
| CART-0011 | Cart | Same variant twice | Guest/customer | Add same twice | Qty increments or two lines per rules |  |
| CART-0012 | Cart | Different sizes same product | Guest/customer | Add S and M | Two lines |  |
| CART-0013 | Cart | API down add | Guest/customer | Stop API; Add | Error; no fake success |  |
| CART-0014 | Cart | Slow 3G add | Guest/customer | Slow 3G Add | Loader then success/error |  |
| AUTH-0015 | Auth | Account login mode | As needed | /account?mode=login | Login UI |  |
| AUTH-0016 | Auth | Account register mode | As needed | /account?mode=register | Register UI |  |
| AUTH-0017 | Auth | Google method | As needed | Continue with Google | Flow or config error |  |
| AUTH-0018 | Auth | Email method | As needed | Continue with email | Email form |  |
| AUTH-0019 | Auth | Phone method | As needed | Continue with phone | Phone form |  |
| AUTH-0020 | Auth | Back options | As needed | All options | Chooser |  |
| AUTH-0021 | Auth | Login empty | As needed | Submit | Validation |  |
| AUTH-0022 | Auth | Login invalid email | As needed | bad@ | Validation |  |
| AUTH-0023 | Auth | Login wrong password | As needed | Wrong | Generic error |  |
| AUTH-0024 | Auth | Login unknown | As needed | nobody@qa.test | Generic error |  |
| AUTH-0025 | Auth | Login success | As needed | Verified user | My Account |  |
| AUTH-0026 | Auth | Register empty | As needed | Submit | Validation |  |
| AUTH-0027 | Auth | Register weak password | As needed | short | Validation |  |
| AUTH-0028 | Auth | Register success | As needed | Unique user | Verify email |  |
| AUTH-0029 | Auth | Duplicate email | As needed | Existing | Conflict |  |
| AUTH-0030 | Auth | Duplicate phone | As needed | Existing | Conflict |  |
| AUTH-0031 | Auth | Forgot link | As needed | Forgot password | /forgot-password |  |
| AUTH-0032 | Auth | Verify email page | As needed | /verify-email | OTP form |  |
| AUTH-0033 | Auth | OTP wrong | As needed | 000000 | Error |  |
| AUTH-0034 | Auth | OTP correct | As needed | Valid OTP | Verified |  |
| AUTH-0035 | Auth | Resend OTP | As needed | Resend | Cooldown; Network |  |
| AUTH-0036 | Auth | Forgot valid | As needed | Email submit | Generic success |  |
| AUTH-0037 | Auth | Reset mismatch | As needed | Different passwords | Validation |  |
| AUTH-0038 | Auth | Reset success | As needed | Valid token | Login new pass |  |
| AUTH-0039 | Auth | Welcome modal close | As needed | Maybe later / Close | Closes |  |
| AUTH-0040 | Auth | Welcome modal Google | As needed | Google | Flow |  |
| AUTH-0041 | Auth | Welcome modal register | As needed | Complete steps | Registers |  |
| AUTH-0042 | Auth | Redirect param | As needed | /account?redirect=/checkout | Returns after login |  |
| AUTH-0043 | Auth | Save wishlist param | As needed | ?save=product | Pending save after login |  |
| AUTH-0044 | Auth | Logout | As needed | Sign out | Logged out |  |
| AUTH-0045 | Auth | Cart merge | As needed | Guest cart then login | POST merge |  |
| CHK-0046 | Checkout COD | Gate logged out | Customer + cart | Guest /checkout | Account/login |  |
| CHK-0047 | Checkout COD | Unverified gate | Customer + cart | Unverified user | Verify required |  |
| CHK-0048 | Checkout COD | Address list | Customer + cart | Has addresses | Radios |  |
| CHK-0049 | Checkout COD | Select address | Customer + cart | Select Continue | Delivery step |  |
| CHK-0050 | Checkout COD | Add address form | Customer + cart | Add new | Fields |  |
| CHK-0051 | Checkout COD | Name empty | Customer + cart | Save | Validation |  |
| CHK-0052 | Checkout COD | Phone invalid | Customer + cart | Save | Validation |  |
| CHK-0053 | Checkout COD | Line empty | Customer + cart | Save | Validation |  |
| CHK-0054 | Checkout COD | City empty | Customer + cart | Save | Validation |  |
| CHK-0055 | Checkout COD | Country default Lebanon | Customer + cart | Inspect | Lebanon default |  |
| CHK-0056 | Checkout COD | Save address | Customer + cart | Valid | POST addresses |  |
| CHK-0057 | Checkout COD | Delivery Standard | Customer + cart | Select | FREE >=150 or $9 |  |
| CHK-0058 | Checkout COD | Delivery Express | Customer + cart | Select | Higher fee |  |
| CHK-0059 | Checkout COD | VIP free delivery credit | Customer + cart | VIP with credits | FREE messaging |  |
| CHK-0060 | Checkout COD | Coupon empty | Customer + cart | Apply | Error/no-op |  |
| CHK-0061 | Checkout COD | Coupon invalid | Customer + cart | BAD | Error |  |
| CHK-0062 | Checkout COD | Coupon valid | Customer + cart | Known | Discount |  |
| CHK-0063 | Checkout COD | VIP % preview | Customer + cart | VIP pending | Shown in summary |  |
| CHK-0064 | Checkout COD | Review step | Customer + cart | Review order | Summary COD |  |
| CHK-0065 | Checkout COD | Back navigation | Customer + cart | Back between steps | Works |  |
| CHK-0066 | Checkout COD | Place COD order | Customer + cart | Place COD order | Success confirmation |  |
| CHK-0067 | Checkout COD | Double click place | Customer + cart | Double click | One order |  |
| CHK-0068 | Checkout COD | Offline place | Customer + cart | Offline | Error no success |  |
| CHK-0069 | Checkout COD | Totals math | Customer + cart | Review | Subtotal+ship-discount |  |
| CHK-0070 | Checkout COD | COD not paid | Customer + cart | After place | Pending/COD not paid |  |
| CHK-0071 | Checkout COD | Confirmation page | Customer + cart | /order-confirmation/id | Order # |  |
| CHK-0072 | Checkout COD | VIP unlock notice | Customer + cart | First qualifying order | VIP messaging/modal |  |
| ORD-0073 | Orders | List | Customer | /orders | List or empty |  |
| ORD-0074 | Orders | Detail own | Own id | Open | Correct |  |
| ORD-0075 | Orders | Detail IDOR | Other id | Open | Denied |  |
| ACC-0076 | Account tab | Details | Logged in | Open Details | Content OK |  |
| ACC-0077 | Account tab | Addresses | Logged in | Open Addresses | Content OK |  |
| ACC-0078 | Account | Update details | Customer | Save | Persists |  |
| ACC-0079 | Account | Add address | Customer | Valid | Created |  |
| ACC-0080 | Account | Set default | Customer | Set default | Flag |  |
| ACC-0081 | Account | Delete address | Customer | Delete | Gone |  |
| ACC-0082 | Account | Orders link | Customer | Orders | /orders |  |
| ACC-0083 | Account | Wishlist link | Customer | Wishlist | /wishlist |  |
| ACC-0084 | Account | VIP badge | Customer | VIP user | Shown |  |
| ACC-0085 | Account | Sign out | Customer | Sign out | Logged out |  |
| WISH-0086 | Wishlist | Guest empty CTAs | As needed | Guest | Sign in prompts |  |
| WISH-0087 | Wishlist | Add from PDP | As needed | Heart | Listed |  |
| WISH-0088 | Wishlist | Remove | As needed | Remove | Gone |  |
| WISH-0089 | Wishlist | Open product | As needed | Click | PDP |  |
| WISH-0090 | Wishlist | Persist | As needed | F5 | Kept |  |
| CNT-0091 | Contact/VIP/CMS | Contact empty | As needed | Submit | Validation |  |
| CNT-0092 | Contact/VIP/CMS | Contact invalid email | As needed | bad@ | Validation |  |
| CNT-0093 | Contact/VIP/CMS | Contact valid | As needed | Fill all | POST /contact |  |
| CNT-0094 | Contact/VIP/CMS | Contact double submit | As needed | Double click | One message |  |
| CNT-0095 | Contact/VIP/CMS | VIP congrats dismiss | As needed | Modal | Close/Continue shopping |  |
| CNT-0096 | Contact/VIP/CMS | VIP congrats ack | As needed | Continue | POST /vip/congrats/ack |  |
| CNT-0097 | Contact/VIP/CMS | Loyalty page CTAs | As needed | /loyalty | Click shop/CTAs |  |
| CNT-0098 | Contact/VIP/CMS | Gifts page CTAs | As needed | /gifts | Click sale/shop |  |
| CNT-0099 | Contact/VIP/CMS | Giveaways page | As needed | /giveaways | Open + CTAs |  |
| CNT-0100 | Contact/VIP/CMS | About page | As needed | /about | Open |  |
| CNT-0101 | Contact/VIP/CMS | Size guide from footer | As needed | Size Guide | Guide content or modal |  |
| CNT-0102 | Contact/VIP/CMS | FAQ from footer | As needed | FAQ | FAQ content |  |
| CNT-0103 | Contact/VIP/CMS | Track order link | As needed | Track Order | Orders or help page |  |
| CNT-0104 | Contact/VIP/CMS | Shipping policy | As needed | /policies/shipping | Readable |  |
| CNT-0105 | Contact/VIP/CMS | Returns policy | As needed | /policies/returns | Readable |  |
| CNT-0106 | Contact/VIP/CMS | Meta feed route if public | As needed | /api/meta-feed | JSON or protected as designed |  |
